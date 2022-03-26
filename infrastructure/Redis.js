const { createClient } = require("redis");

module.exports = class Redis {

    constructor() {
        this.connection = null;
    }

    static async getConnection() {

        if (this.connection) {
            
            return this.connection;
        }

        this.connection = createClient({
            socket: {
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT,
            },
        });
    
        await this.connection.connect();
    }

    static async save(cookie) {
        
        this.getConnection();
        this.connection.set("COOKIES", cookie);
    }
}