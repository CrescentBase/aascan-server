import EntryPointManager from "./EntryPointManager.js";
import { getLogger } from '../config/LoggerUtils.js';
import {getBaseHeaders, timeoutFetch} from "../utils/FetchUtils.js";
import ConnectionManager from "../apiserver/ConnectionManager.js";
import utils from "util";

const logger = getLogger("InternalTxsManager");

class InternalTxsManager {
    intervalTime = 2 * 1000;

    async init() {
        setTimeout(async () => {
            await this.intervalTask();
            this.init()
        }, this.intervalTime);
    }

    async intervalTask() {
        // logger.info("intervalTask start")
        const infos = await EntryPointManager.getAllScanInfo();
        if (!infos) {
            logger.info("load ScanInfo is null")
            return;
        }

        for (const chainId in infos) {
            const info = infos[chainId];
            const url = info.url;
            const key = info.key;
            const hash = await this.getNotInternalTx(chainId);

            if (!hash) {
                logger.info("intervalTask not hash")
                continue;
            }
            const internalTxs = await this.fetchScanInternalTx(url, hash, key);
            if (!internalTxs) {
                continue;
            }
            logger.info("intervalTask hash:", hash, internalTxs?.length)
            await this.updateInternalTx(chainId, hash, internalTxs);
        }
    }

    async justGetInternalTx(chainId, hash) {
        const info = await EntryPointManager.getScanInfo(chainId);
        if (!info) {
            return [];
        }
        const internalTxs = await this.fetchScanInternalTx(info.url, hash, info.key);
        if (!internalTxs) {
            return [];
        }
        await this.updateInternalTx(chainId, hash, internalTxs);
        return internalTxs;
    }

    async fetchScanInternalTx(url, txhash, key) {
        // https://api.etherscan.io/api?module=account&action=txlistinternal&txhash=0xa829b640a589017dd44edd3f6a299973084f3417b0314eb108fcad4cce553142
        const scanUrl = `${url}/api?module=account&action=txlistinternal&txhash=${txhash}&apikey=${key}`;
        try {
            const response = await timeoutFetch(scanUrl, {
                method: 'GET',
                headers: getBaseHeaders()
            });
            const data = await response.json();
            return data.result;
        } catch (e) {
            logger.warn("fetchScanInternalTx e", utils.inspect(e));
        }
        return undefined;
    }

    async getNotInternalTx(chainId) {
        const sql = 'SELECT hash FROM ENTRY_POINT_TXS WHERE chain_id=? AND internalTxs IS NULL ORDER BY blockNumber+0 DESC LIMIT 1';
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId, chainId]);
        return result?.[0]?.hash;
    }

    async updateInternalTx(chainId, txhash, internalTxs) {
        if (!internalTxs) {
            return;
        }
        const json = JSON.stringify(internalTxs);
        const sql = 'UPDATE ENTRY_POINT_TXS SET internalTxs=? WHERE chain_id=? AND hash=?';
        await ConnectionManager.getInstance().querySql(sql, [json, chainId, txhash]);
    }

}

const instance = new InternalTxsManager();
export default instance;
