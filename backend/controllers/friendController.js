const { FriendRequest, User, Notification } = require('../models');
const NotificationService = require('../services/notificationService');

const sendFriendRequest = async (req, res, next) => {
  try {
    const { receiver_id } = req.body;
    const sender_id = req.user.id;

    if (sender_id === receiver_id) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself.' });
    }

    // Check if receiver exists
    const receiver = await User.findByPk(receiver_id);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if friend request already exists
    const existingRequest = await FriendRequest.findOne({
      where: {
        sender_id,
        receiver_id
      }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent.' });
    }

    // Create friend request
    const friendRequest = await FriendRequest.create({
      sender_id,
      receiver_id,
      status: 'pending'
    });

    // Send notification to receiver
    await NotificationService.createNotification({
      userId: receiver_id,
      title: 'New Friend Request',
      message: `${req.user.username} sent you a friend request.`,
      type: 'friend_request',
      relatedEntity: { model: User, id: sender_id },
    });

    res.status(201).json({
      message: 'Friend request sent successfully.',
      friendRequest
    });
  } catch (error) {
    next(error);
  }
};

const getFriendRequests = async (req, res, next) => {
  try {
    const user_id = req.user.id;

    const friendRequests = await FriendRequest.findAll({
      where: {
        receiver_id: user_id,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(friendRequests);
  } catch (error) {
    next(error);
  }
};

const respondToFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const user_id = req.user.id;

    const friendRequest = await FriendRequest.findOne({
      where: {
        id,
        receiver_id: user_id,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username']
        }
      ]
    });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found.' });
    }

    if (action === 'accept') {
      await friendRequest.update({ status: 'accepted' });
      
      // Create friendship records for both users
      await Promise.all([
        // This would be in a Friends model/table
        // For simplicity, we'll just update the request status
        // In a real implementation, you'd create entries in a friends table
      ]);

      // Send notification to sender
      await NotificationService.createNotification({
        userId: friendRequest.sender_id,
        title: 'Friend Request Accepted',
        message: `${req.user.username} accepted your friend request.`,
        type: 'friend_request',
        relatedEntity: { model: User, id: user_id },
      });

      res.json({ message: 'Friend request accepted.' });
    } else if (action === 'reject') {
      await friendRequest.update({ status: 'rejected' });
      
      // Send notification to sender
      await NotificationService.createNotification({
        userId: friendRequest.sender_id,
        title: 'Friend Request Declined',
        message: `${req.user.username} declined your friend request.`,
        type: 'friend_request',
        relatedEntity: { model: User, id: user_id },
      });

      res.json({ message: 'Friend request rejected.' });
    } else {
      res.status(400).json({ message: 'Invalid action. Use "accept" or "reject".' });
    }
  } catch (error) {
    next(error);
  }
};

const getFriends = async (req, res, next) => {
  try {
    const user_id = req.user.id;

    // This would query the friends table
    // For now, we'll return accepted friend requests
    const friends = await FriendRequest.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { sender_id: user_id },
          { receiver_id: user_id }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    // Format response to show friend info
    const formattedFriends = friends.map(request => {
      const isSender = request.sender_id === user_id;
      return isSender ? request.receiver : request.sender;
    });

    res.json(formattedFriends);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  getFriends
};
