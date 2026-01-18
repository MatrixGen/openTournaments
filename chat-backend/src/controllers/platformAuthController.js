/**
 * Platform Login Controller
 * 
 * Handles authentication requests from the platform backend.
 * This endpoint is secured by a shared secret and creates/updates
 * chat users based on platform user data.
 * 
 * This replaces password-based authentication for platform integration.
 */

const { User } = require('../../models');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

// Environment variable for platform secret
const PLATFORM_SECRET = process.env.PLATFORM_SECRET || process.env.CHAT_PLATFORM_SECRET;

/**
 * Verify platform secret from request header
 */
const verifyPlatformSecret = (req) => {
  const secret = req.headers['x-platform-secret'];
  
  if (!PLATFORM_SECRET) {
    console.error('[PlatformLogin] PLATFORM_SECRET not configured!');
    return false;
  }
  
  if (!secret) {
    console.warn('[PlatformLogin] Missing X-Platform-Secret header');
    return false;
  }
  
  // Debug: Log lengths for comparison (never log actual secrets!)
  console.log(`[PlatformLogin] Secret comparison - header length: ${secret.length}, env length: ${PLATFORM_SECRET.length}`);
  
  const match = secret === PLATFORM_SECRET;
  if (!match) {
    console.warn(`[PlatformLogin] Secret mismatch! Header starts with: ${secret.substring(0, 4)}..., Env starts with: ${PLATFORM_SECRET.substring(0, 4)}...`);
  }
  
  return match;
};

/**
 * Platform Login Endpoint
 * 
 * POST /api/v1/auth/platform-login
 * 
 * Headers:
 *   X-Platform-Secret: <shared-secret>
 * 
 * Body:
 *   {
 *     platformUserId: number (required) - Platform user ID
 *     email: string (required) - User email
 *     username: string (required) - Username
 *     profilePicture: string (optional) - Avatar URL
 *   }
 * 
 * Returns:
 *   {
 *     success: true,
 *     data: {
 *       user: { id, email, username, ... },
 *       token: string (access token),
 *       refreshToken: string
 *     }
 *   }
 */
const platformLogin = async (req, res) => {
  try {
    // Verify platform secret
    if (!verifyPlatformSecret(req)) {
      console.warn('[PlatformLogin] Invalid or missing platform secret');
      return res.status(401).json(
        errorResponse('Unauthorized: Invalid platform secret', 'INVALID_SECRET')
      );
    }

    const { platformUserId, email, username, profilePicture } = req.body;

    // Validate required fields
    if (!platformUserId) {
      return res.status(400).json(
        errorResponse('platformUserId is required', 'MISSING_PLATFORM_USER_ID')
      );
    }

    if (!email) {
      return res.status(400).json(
        errorResponse('email is required', 'MISSING_EMAIL')
      );
    }

    if (!username) {
      return res.status(400).json(
        errorResponse('username is required', 'MISSING_USERNAME')
      );
    }

    console.log(`[PlatformLogin] Processing login for platform user ${platformUserId} (${email})`);

    // Find existing chat user by platform user ID
    let user = await User.findOne({
      where: { platformUserId: platformUserId }
    });

    if (user) {
      // Update existing user
      console.log(`[PlatformLogin] Found existing chat user ${user.id}`);
      
      // Update fields if changed
      let updated = false;
      
      if (user.email !== email) {
        // Check email not taken by another user
        const emailExists = await User.findOne({
          where: { email, id: { [require('sequelize').Op.ne]: user.id } }
        });
        if (!emailExists) {
          user.email = email;
          updated = true;
        }
      }
      
      if (user.username !== username) {
        // Check username not taken by another user
        const usernameExists = await User.findOne({
          where: { username, id: { [require('sequelize').Op.ne]: user.id } }
        });
        if (!usernameExists) {
          user.username = username;
          updated = true;
        }
      }
      
      if (profilePicture && user.profilePicture !== profilePicture) {
        user.profilePicture = profilePicture;
        updated = true;
      }

      // Update status
      user.status = 'online';
      user.isOnline = true;
      
      if (updated) {
        await user.save();
        console.log(`[PlatformLogin] Updated chat user ${user.id}`);
      }

    } else {
      // Check if user exists by email (for migration)
      user = await User.findOne({ where: { email } });
      
      if (user) {
        // Link existing user to platform
        console.log(`[PlatformLogin] Linking existing email user ${user.id} to platform user ${platformUserId}`);
        user.platformUserId = platformUserId;
        user.status = 'online';
        user.isOnline = true;
        
        if (user.username !== username) {
          const usernameExists = await User.findOne({
            where: { username, id: { [require('sequelize').Op.ne]: user.id } }
          });
          if (!usernameExists) {
            user.username = username;
          }
        }
        
        if (profilePicture) {
          user.profilePicture = profilePicture;
        }
        
        await user.save();

      } else {
        // Create new chat user
        console.log(`[PlatformLogin] Creating new chat user for platform user ${platformUserId}`);
        
        // Ensure unique username
        let finalUsername = username;
        let counter = 1;
        while (await User.findOne({ where: { username: finalUsername } })) {
          finalUsername = `${username}_${counter}`;
          counter++;
          if (counter > 100) {
            finalUsername = `${username}_${Date.now().toString().slice(-6)}`;
            break;
          }
        }

        user = await User.create({
          platformUserId: platformUserId,
          email: email,
          username: finalUsername,
          profilePicture: profilePicture || null,
          // No password needed - auth is via platform
          passwordHash: 'PLATFORM_AUTH_NO_PASSWORD',
          status: 'online',
          isOnline: true
        });

        console.log(`[PlatformLogin] Created chat user ${user.id}`);
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Build response
    const userResponse = {
      id: user.id,
      platformUserId: user.platformUserId,
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture,
      status: user.status,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt
    };

    console.log(`[PlatformLogin] Success for platform user ${platformUserId} -> chat user ${user.id}`);

    res.json(
      successResponse(
        {
          user: userResponse,
          token: accessToken,
          refreshToken: refreshToken,
          userId: user.id
        },
        'Platform login successful'
      )
    );

  } catch (error) {
    console.error('[PlatformLogin] Error:', error);
    res.status(500).json(
      errorResponse('Platform login failed', 'PLATFORM_LOGIN_ERROR')
    );
  }
};

/**
 * Platform Logout Endpoint
 * 
 * POST /api/v1/auth/platform-logout
 * 
 * Headers:
 *   X-Platform-Secret: <shared-secret>
 * 
 * Body:
 *   { platformUserId: number }
 */
const platformLogout = async (req, res) => {
  try {
    if (!verifyPlatformSecret(req)) {
      return res.status(401).json(
        errorResponse('Unauthorized: Invalid platform secret', 'INVALID_SECRET')
      );
    }

    const { platformUserId } = req.body;

    if (!platformUserId) {
      return res.status(400).json(
        errorResponse('platformUserId is required', 'MISSING_PLATFORM_USER_ID')
      );
    }

    const user = await User.findOne({
      where: { platformUserId: platformUserId }
    });

    if (user) {
      user.status = 'offline';
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
      console.log(`[PlatformLogout] User ${user.id} logged out`);
    }

    res.json(
      successResponse(null, 'Platform logout successful')
    );

  } catch (error) {
    console.error('[PlatformLogout] Error:', error);
    res.status(500).json(
      errorResponse('Platform logout failed', 'PLATFORM_LOGOUT_ERROR')
    );
  }
};

module.exports = {
  platformLogin,
  platformLogout,
  verifyPlatformSecret
};
