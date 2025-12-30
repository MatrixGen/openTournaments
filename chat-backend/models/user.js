const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Link to platform user
      User.belongsTo(models.User, { 
        foreignKey: 'platformUserId',
        as: 'User',
        constraints: false ,
        foreignKeyConstraint: false // Important: references different model
      });
      
      // A user can create many channels
      User.hasMany(models.Channel, { foreignKey: 'createdBy', as: 'createdChannels' });
      // In your User model, add:
      User.hasMany(models.Reaction, { foreignKey: 'userId', as: 'reactions' });
      
      // A user can be a member of many channels
      User.belongsToMany(models.Channel, {
        through: 'ChannelMembers',
        foreignKey: 'userId',
        as: 'channels'
      });
      
      // A user can send many messages
      User.hasMany(models.Message, { foreignKey: 'userId', as: 'messages' });
      
      // A user can have many read receipts
      User.hasMany(models.ReadReceipt, { foreignKey: 'userId', as: 'readReceipts' });
    }
  }

  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    platformUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      comment: 'Reference to platform user ID'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 30],
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profilePicture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'away'),
      defaultValue: 'offline',
    },
    lastSeen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'User',
    underscored:false,
    tableName: 'chatUsers',
    hooks: {
      beforeUpdate: (user) => {
        user.updatedAt = new Date();
      },
    },
  });

  return User;
};