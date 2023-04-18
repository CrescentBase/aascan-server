var runningEnv = "dev";
if (process.env.NODE_ENV) {
    runningEnv = process.env.NODE_ENV;
}
console.log('runningEnv', runningEnv);
const addresses = {
    dev: {
        serverPort: 6002,
        mysqlServer: 'localhost',
        mysqlUser: 'root',
        mysqlPass: '123456',
        mysqlDatabase: 'ExplorerDB',
        dialect: 'mysql',
    },
    test: {
        serverPort: 6002,
        mysqlServer: 'localhost',
        mysqlUser: 'root',
        mysqlPass: '123456',
        mysqlDatabase: 'ExplorerDB',
        dialect: 'mysql',
    },
    prod: {
        serverPort: 6002,
        mysqlServer: 'database-1.cbuxwfggs7fo.us-west-1.rds.amazonaws.com',
        mysqlUser: 'admin',
        mysqlPass: 'ZwQTWy4k56yHrX8IjoIF',
        mysqlDatabase: 'ExplorerDB',
        dialect: 'mysql',
    },

    getServerPort: function () {
        return process.env.PORT || this[runningEnv].serverPort;
    },
    getRunningEnv : function(){
        return runningEnv;
    },
    getMysqlServer: function() {
        return this[runningEnv].mysqlServer;
    },
    getMysqlUser: function() {
        return this[runningEnv].mysqlUser;
    },
    getMysqlPass: function() {
        return this[runningEnv].mysqlPass;
    },
    getMysqlDatabase: function() {
        return this[runningEnv].mysqlDatabase;
    }
}

export default addresses;
