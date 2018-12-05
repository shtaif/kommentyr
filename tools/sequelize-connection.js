const Sequelize = require('sequelize');


module.exports = new Sequelize(process.env.KMTR_MYSQL_URI, {
    logging: false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});