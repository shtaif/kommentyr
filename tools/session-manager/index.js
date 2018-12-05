const
    Sequelize = require('sequelize'),
    uid = require('uid-safe');


module.exports = class SessionManager {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.timeoutId = null;

        this.UserSession = this.sequelize.define(
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
        
        this.UserSession.sync({ alter: true });

        // this.scheduleExpireCleanup();

        setInterval(async () => {
            await this.UserSession.destroy({
                where: {
                    expiresAt: { $lte: new Date }
                }
            });
        }, 1000 * 60);
    }


    // async scheduleExpireCleanup() {
    //     while (true) {
    //         const session = await this.UserSession.findOne({
    //             order: [['expiresAt', 'ASC']]
    //         });
    //         console.log('session.destroy', session.destroy);
    //         if (this.isStopped) {
    //             break;
    //         }
    //         const timeToExpire = session.expiresAt.getTime() - Date.now();
    //         await new Promise(resolve => this.timeoutId = setTimeout(resolve, timeToExpire));
    //         await session.destroy();
    //     }
    // }


    async create(userId, ttl) {
        const now = new Date;
        const token = `${now.getTime()}-${await uid(24)}`;
        
        const session = await this.UserSession.create({
            token,
            userId: userId,
            expiresAt: new Date(now.getTime() + ttl)
        });

        // this.scheduleExpireCleanup();

        return session;
    }


    async updateTtl(token, ttl) {
        const result = await this.UserSession.update(
            { expiresAt: new Date(Date.now() + ttl) },
            { where: { token } }
        );
        return result;
    }


    async getOne(filterParams) {
        return await this.UserSession.findOne({
            where: filterParams
        });
    }


    async getMany(filterParams) {
        return await this.UserSession.findAll({
            where: filterParams
        });
    }


    async destroy(sessionTokens) {
        if (!sessionTokens.length) {
            return;
        }
        await this.UserSession.destroy({
            where: { token: sessionTokens }
        });
    }
};