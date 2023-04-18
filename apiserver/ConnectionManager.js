import log4js from "log4js";
import mysql from 'mysql2';
import EventEmitter from "events";
import utils from 'util';
import addresses from '../config/address.js';

const logger = log4js.getLogger('ConnectionManager');
let instance = null;

class ConnectionManager extends EventEmitter {

    static getInstance = () => {
        if(!instance) {
            instance = new ConnectionManager();
        }
        return instance;
    }

    static DATABASE_CONNECTION_ERROR = "ConnectionMananger.DatabaseConnectionError";
    static DATABASE_ERROR = "ConnectionMananger.DatabaseError";
    static CONNECTED = "ConnectionManager.Connected";

    constructor() {
        super();
        const dbConfig = {
            host: addresses.getMysqlServer(),
            user: addresses.getMysqlUser(),
            password: addresses.getMysqlPass(),
            database: addresses.getMysqlDatabase(),
            charset : 'utf8mb4',
            connectionLimit: 100
        };
        logger.debug("create database connection pool: ", dbConfig, addresses.getRunningEnv());
        this.pool = mysql.createPool(dbConfig);
        this.heartbeatTimer = null;
        this.heartbeatStarted = false;
    }

    connect() {
        const self = this;
        logger.debug("ready to connect database");
        this.pool.on('queue', function () { console.log('========>conn queued') });
        this.pool.getConnection(function (err, conn) {
            if (err) {
                logger.error("can not connect to database", utils.inspect(err));
                self.emit(ConnectionManager.DATABASE_CONNECTION_ERROR, err);
            } else {
                logger.debug("database connected");
                self.connection = conn;
                self.connection.on("error", function (error) {
                    logger.error("sql service error occurs", utils.inspect(error));
                    self.emit(ConnectionManager.DATABASE_ERROR, error);
                });
                self.emit(ConnectionManager.CONNECTED);
                self.startHeartBeat();
            }
        });
    }

    startHeartBeat() {
        if (!this.heartbeatStarted) {
        if (this.heartbeatTimer) {
            clearTimeout(this.heartbeatTimer);
        } else {
            this.heartbeatTimer = setTimeout(
                this.heartbeat.bind(this),
                30 * 60 * 1000
            );
        }
        }
    }

    heartbeat() {
        var self = this;
        this.connection.query("show tables", null, function (
        err,
        vals
        ) {
        if (err) {
            logger.error("heart beat failed", err);
        } else {
            logger.debug("heart beat vals", vals);
            self.timer = setTimeout(self.heartbeat.bind(self), 30 * 60 * 1000);
        }
        });
    }

    getNewSqlConnection() {
        return new Promise((resolve, reject) => {
        this.pool.getConnection((err, conn) => {
            if (err) {
            reject(err);
            } else {
            resolve(conn);
            }
        });
        });
    }

    getSqlConnection() {
        return this.connection;
    }

    async querySql(sql, paramArr = []) {
        let paramArrStr = JSON.stringify(paramArr);
        return new Promise((resolve, reject) => {
            ConnectionManager.getInstance()
                .getNewSqlConnection().then(conn => {
                conn.query(sql, paramArr, (err, vals) => {
                        conn.release();
                        // logger.info('querySql result: ', vals);
                        if (err) {
                            reject(err);
                        } else {
                            resolve(vals);
                        }
                    }
                );
            }).catch(err => {
                if(paramArrStr){
                    logger.error("querySql:" + sql + " err:" + err);
                }else{
                    logger.error("querySql:" + sql + " " + paramArr + " err:" + err);
                }
                reject(err);
            });
        });
    }
}

export default ConnectionManager;
