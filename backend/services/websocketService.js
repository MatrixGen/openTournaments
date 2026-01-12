const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userID -> WebSocket connection
    this.connections = new Map(); // connectionID -> {ws, userId}
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      const connectionId = uuidv4();
      
      console.log('New WebSocket connection:', connectionId);

      // Store connection
      this.connections.set(connectionId, { ws, userId: null });

      // Handle authentication message
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'auth' && message.token) {
            // Verify JWT token and associate connection with user
            this.authenticateConnection(connectionId, message.token);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        const connection = this.connections.get(connectionId);
        if (connection && connection.userId) {
          // Remove from clients map
          const userConnections = this.clients.get(connection.userId) || new Set();
          userConnections.delete(connectionId);
          if (userConnections.size === 0) {
            this.clients.delete(connection.userId);
          } else {
            this.clients.set(connection.userId, userConnections);
          }
        }
        
        this.connections.delete(connectionId);
        console.log('WebSocket connection closed:', connectionId);
      });

      // Send connection ID to client
      ws.send(JSON.stringify({
        type: 'connection',
        connectionId
      }));
    });
  }

  async authenticateConnection(connectionId, token) {
    try {
      // Verify JWT token (you'll need to import your auth logic)
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.userId = decoded.userId;
        
        // Add to clients map
        let userConnections = this.clients.get(decoded.userId) || new Set();
        userConnections.add(connectionId);
        this.clients.set(decoded.userId, userConnections);
        
        console.log(`User ${decoded.userId} authenticated via WebSocket`);
        
        // Send success message
        connection.ws.send(JSON.stringify({
          type: 'auth_success',
          message: 'Authentication successful'
        }));
      }
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.ws.send(JSON.stringify({
          type: 'auth_error',
          message: 'Authentication failed'
        }));
        connection.ws.close();
      }
    }
  }

  sendToUser(userId, data) {
    const userConnections = this.clients.get(userId);
    if (userConnections) {
      userConnections.forEach(connectionId => {
        const connection = this.connections.get(connectionId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify(data));
        }
      });
    }
  }

  // Add these methods to your WebSocketService class

  sendMatchUpdate(matchData) {
    this.broadcast({
      type: 'match_update',
      data: matchData
    });
  }

  sendTournamentUpdate(tournamentData) {
    this.broadcast({
      type: 'tournament_update',
      data: tournamentData
    });
  }

  broadcast(data) {
    this.connections.forEach((connection, connectionId) => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(data));
      }
    });
  }
}

module.exports = new WebSocketService();