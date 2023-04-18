import { getLogger, log4js } from '../config/LoggerUtils.js';
import express from 'express';
import cors from 'cors';
import addresses from '../config/address.js';
import queryRouter from './query.js';
import ConnectionManager from './ConnectionManager.js';
import EntryPointManager from "../core/EntryPointManager.js";
import InternalTxsManager from "../core/InternalTxsManager.js";

// import path from 'path';
// import { fileURLToPath } from 'url';

const logger = getLogger("app");
const app = express();
app.disable('x-powered-by');
app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors({
    // origin: '*',
    credentials: true
}));
app.use('/api/v1', queryRouter);

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// app.use('/api/v1/res', express.static(__dirname + '/../res'));

app.use(function (err, req, res, next) {

    var ret = {
        ret: -1,
        error: err,
        errcode: 5000,
        errmsg: 'internal error' + err
    };
    logger.error(
        "request: %s =====> failed: %s",
        req.path,
        JSON.stringify(ret),
        err
    );
    res.json(ret);
});

let mainFunc = async () => {
    console.log('Engine', process.env.Engine);
    if (process.env.Engine) {
        await EntryPointManager.init();
        await InternalTxsManager.init();
    }
    app.listen(addresses.getServerPort(), (err) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${addresses.getServerPort()}`);
    })
}

const connectionManager = ConnectionManager.getInstance();
connectionManager.on(ConnectionManager.CONNECTED, async () => {
    mainFunc();
})
connectionManager.connect();

