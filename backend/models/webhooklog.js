// models/WebhookLog.js
module.exports = (sequelize, DataTypes) => {
    const WebhookLog = sequelize.define('WebhookLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        webhook_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        event_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        order_reference: {
            type: DataTypes.STRING,
            allowNull: true
        },
        payload: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        raw_body: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        signature_header: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('processing', 'completed', 'failed'),
            defaultValue: 'processing'
        },
        result: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        processed_at: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'webhook_logs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['webhook_id', 'event_type']
            },
            {
                fields: ['order_reference']
            },
            {
                fields: ['event_type']
            },
            {
                fields: ['status']
            },
            {
                fields: ['processed_at']
            }
        ]
    });
    
    return WebhookLog;
};