const { User, Channel, ChannelMember } = require('../../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { Op } = require('sequelize');

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: Channel,
          as: 'channels',
          through: { attributes: [] } // Exclude join table attributes
        }
      ]
    });

    res.json(
      successResponse(
        { user },
        'User profile retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve user profile', 'USER_RETRIEVAL_ERROR')
    );
  }
};

const updateCurrentUser = async (req, res) => {
  try {
    const { username, profilePicture, status } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (profilePicture) updateData.profilePicture = profilePicture;
    if (status) updateData.status = status;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await User.findOne({
        where: {
          username,
          id: { [Op.ne]: req.user.id }
        }
      });

      if (existingUser) {
        return res.status(409).json(
          errorResponse('Username is already taken', 'USERNAME_TAKEN')
        );
      }
    }

    await User.update(updateData, {
      where: { id: req.user.id }
    });

    // Get updated user
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] }
    });

    res.json(
      successResponse(
        { user: updatedUser },
        'User profile updated successfully'
      )
    );
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json(
      errorResponse('Failed to update user profile', 'USER_UPDATE_ERROR')
    );
  }
};

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      
      return res.status(400).json(
        errorResponse(`Search query must be at least 2 characters', 'INVALID_QUERY`)
      );
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%${q}%` } }
        ]
      },
      attributes: ['id', 'username', 'email', 'profilePicture', 'status', 'lastSeen'],
      limit: 20
    });

    res.json(
      successResponse(
        { users },
        'Users found successfully'
      )
    );
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json(
      errorResponse(`Failed to search users', 'SEARCH_ERROR ${error}`)
    );
  }
};

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  searchUsers
};