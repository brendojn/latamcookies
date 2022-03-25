const redis = require("redis");

module.exports = class Redis {

    static async getConnection() {

        this.connection = createClient({
            socket: {
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT,
            },
        });
    
        await connection.connect();
    
        return connection;
    }
}