// services/websocketService.js — safer + production-friendly
// - Adds graceful shutdown (close())
// - Adds heartbeat/ping to kill dead connections
// - Prevents memory leaks (cleans up on close/error)
// - Safer auth flow + message validation + rate limiting
// - Avoids requiring jsonwebtoken repeatedly per message
// - Supports multiple connections per user (your current design) reliably

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

class WebSocketService {
  constructor() {
    this.wss = null;

    // userId -> Set<connectionId>
    this.clients = new Map();

    // connectionId -> { ws, userId, isAlive, createdAt, lastMessageAt }
    this.connections = new Map();

    // Simple per-connection message rate limit (token bucket-ish)
    this.rate = new Map(); // connectionId -> { count, windowStart }

    this.heartbeatInterval = null;
    this.HEARTBEAT_MS = 30_000;

    // Optional: allow only certain message types
    this.ALLOWED_TYPES = new Set(['auth']);
  }

  initialize(server) {
    if (this.wss) {
      console.warn('[WS] WebSocketService already initialized. Skipping.');
      return;
    }

    this.wss = new WebSocket.Server({
      server,
      path: '/ws',
      // keep it small; increase if needed
      maxPayload: 64 * 1024, // 64KB
    });

    this.wss.on('connection', (ws, req) => {
      const connectionId = uuidv4();

      // Basic hardening
      ws.isAlive = true;

      // Track connection
      this.connections.set(connectionId, {
        ws,
        userId: null,
        isAlive: true,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      });

      // Heartbeat response from client
      ws.on('pong', () => {
        const c = this.connections.get(connectionId);
        if (c) c.isAlive = true;
      });

      ws.on('message', (raw) => {
        const c = this.connections.get(connectionId);
        if (!c) return;

        // Rate limit to prevent spam / DoS by one socket
        if (!this._allowMessage(connectionId)) {
          this._safeSend(ws, { type: 'error', message: 'Rate limit exceeded' });
          return;
        }

        c.lastMessageAt = Date.now();

        const msg = this._parseJson(raw);
        if (!msg) {
          this._safeSend(ws, { type: 'error', message: 'Invalid JSON' });
          return;
        }

        const { type } = msg;
        if (!type || typeof type !== 'string') {
          this._safeSend(ws, { type: 'error', message: 'Missing message type' });
          return;
        }

        // Only process allowed message types
        if (!this.ALLOWED_TYPES.has(type)) {
          this._safeSend(ws, { type: 'error', message: `Unsupported message type: ${type}` });
          return;
        }

        if (type === 'auth') {
          const token = msg.token;
          if (!token || typeof token !== 'string') {
            this._safeSend(ws, { type: 'auth_error', message: 'Missing token' });
            ws.close(1008, 'Missing token'); // policy violation
            return;
          }

          this.authenticateConnection(connectionId, token);
        }
      });

      ws.on('error', (err) => {
        // Ensure we cleanup on error too
        console.error('[WS] socket error:', err?.message || err);
        this._cleanupConnection(connectionId);
      });

      ws.on('close', () => {
        this._cleanupConnection(connectionId);
      });

      // Send initial connection id
      this._safeSend(ws, { type: 'connection', connectionId });
      console.log('[WS] New connection:', connectionId, 'from', req?.socket?.remoteAddress || 'unknown');
    });

    // Heartbeat interval to terminate dead sockets
    this.heartbeatInterval = setInterval(() => {
      for (const [connectionId, c] of this.connections.entries()) {
        if (!c?.ws) continue;

        if (c.isAlive === false) {
          try {
            c.ws.terminate();
          } catch (_) {}
          this._cleanupConnection(connectionId);
          continue;
        }

        c.isAlive = false;
        try {
          c.ws.ping();
        } catch (_) {
          this._cleanupConnection(connectionId);
        }
      }
    }, this.HEARTBEAT_MS);

    // Avoid keeping the process alive just for this interval
    this.heartbeatInterval.unref?.();

    console.log('[WS] WebSocket server initialized at path /ws');
  }

  async authenticateConnection(connectionId, token) {
    const c = this.connections.get(connectionId);
    if (!c) return;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Support both {id} and {userId}
      const userId = decoded?.userId ?? decoded?.id;
      if (!userId) {
        this._safeSend(c.ws, { type: 'auth_error', message: 'Invalid token payload' });
        c.ws.close(1008, 'Invalid token payload');
        return;
      }

      c.userId = userId;

      // Add connection id to user’s set
      const set = this.clients.get(userId) || new Set();
      set.add(connectionId);
      this.clients.set(userId, set);

      console.log(`[WS] User ${userId} authenticated (conn=${connectionId})`);

      this._safeSend(c.ws, { type: 'auth_success', message: 'Authentication successful' });
    } catch (err) {
      console.error('[WS] auth failed:', err?.message || err);
      this._safeSend(c.ws, { type: 'auth_error', message: 'Authentication failed' });
      try {
        c.ws.close(1008, 'Authentication failed');
      } catch (_) {}
      this._cleanupConnection(connectionId);
    }
  }

  sendToUser(userId, data) {
    const set = this.clients.get(userId);
    if (!set || set.size === 0) return;

    for (const connectionId of set) {
      const c = this.connections.get(connectionId);
      if (!c?.ws) continue;

      if (c.ws.readyState === WebSocket.OPEN) {
        this._safeSend(c.ws, data);
      } else {
        this._cleanupConnection(connectionId);
      }
    }
  }

  sendMatchUpdate(matchData) {
    this.broadcast({ type: 'match_update', data: matchData });
  }

  sendTournamentUpdate(tournamentData) {
    this.broadcast({ type: 'tournament_update', data: tournamentData });
  }

  broadcast(data) {
    for (const [connectionId, c] of this.connections.entries()) {
      if (!c?.ws) continue;

      if (c.ws.readyState === WebSocket.OPEN) {
        this._safeSend(c.ws, data);
      } else {
        this._cleanupConnection(connectionId);
      }
    }
  }

  /**
   * Graceful shutdown hook.
   * Call this from server.js during shutdown before closing HTTP server.
   */
  async close() {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (!this.wss) return;

      // Close all sockets
      for (const [connectionId, c] of this.connections.entries()) {
        try {
          c.ws.close(1001, 'Server shutting down');
        } catch (_) {}
        this._cleanupConnection(connectionId);
      }

      // Close WebSocket server
      await new Promise((resolve) => {
        this.wss.close(() => resolve());
      });

      this.wss = null;
      console.log('[WS] WebSocket server closed');
    } catch (err) {
      console.error('[WS] close() failed:', err?.message || err);
    }
  }

  /* =========================
     Internals
     ========================= */

  _safeSend(ws, obj) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj));
      }
    } catch (err) {
      // If send fails, the connection is likely dead
    }
  }

  _parseJson(raw) {
    try {
      const s = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
      return JSON.parse(s);
    } catch (_) {
      return null;
    }
  }

  _cleanupConnection(connectionId) {
    const c = this.connections.get(connectionId);
    if (!c) return;

    const userId = c.userId;

    // Remove from user mapping
    if (userId != null) {
      const set = this.clients.get(userId);
      if (set) {
        set.delete(connectionId);
        if (set.size === 0) this.clients.delete(userId);
      }
    }

    // Cleanup rate limiter state
    this.rate.delete(connectionId);

    // Delete connection record
    this.connections.delete(connectionId);

    // Ensure socket is dead
    try {
      if (c.ws && c.ws.readyState === WebSocket.OPEN) {
        c.ws.terminate();
      }
    } catch (_) {}

    // Log
    // console.log('[WS] Cleaned connection:', connectionId);
  }

  _allowMessage(connectionId) {
    const now = Date.now();
    const WINDOW_MS = 5_000;
    const MAX_MSG = 20;

    const r = this.rate.get(connectionId) || { count: 0, windowStart: now };
    if (now - r.windowStart > WINDOW_MS) {
      r.count = 0;
      r.windowStart = now;
    }

    r.count += 1;
    this.rate.set(connectionId, r);

    return r.count <= MAX_MSG;
  }
}

module.exports = new WebSocketService();
