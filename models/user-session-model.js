const
    Sequelize = require('sequelize');
    sequelizeInst = require('../tools/sequelize-connection.js');


const UserSession = sequelizeInst.define(
    'userSession',
    {
        token: {
            type: Sequelize.UUID,
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        userId: {
            type: Sequelize.STRING
        },
        expiresAt: {
            type: Sequelize.DATE(3)
        },
        createdAt: {
            type: Sequelize.DATE(3)
        },
        updatedAt: {
            type: Sequelize.DATE(3)
        }
    },
    {
        engine: 'MEMORY'
    }
);

UserSession.sync({ alter: true });

module.exports = UserSession;