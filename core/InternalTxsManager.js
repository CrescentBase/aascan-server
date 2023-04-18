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
            logger.info("load ScanInfo is null");
            return;
        }

        for (const chainId in infos) {
            const info = infos[chainId];
            const url = info.url;
            const key = info.key;
            const { transactionHash, address } = await this.getNotInternalTx(chainId);

            if (!transactionHash) {
                // logger.info("intervalTask not hash");
                continue;
            }
            const internalTxs = await this.fetchScanInternalTx(url, transactionHash, key);
            if (!internalTxs) {
                continue;
            }
            logger.info("intervalTask hash:", transactionHash, chainId, internalTxs?.length)
            await this.updateInternalTx(chainId, address, transactionHash, internalTxs);
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
        const sql = `SELECT TXS.hash AS transactionHash, TXS.address AS address 
                     FROM ENTRY_POINT_TXS AS TXS  
                     LEFT JOIN ENTRY_POINT_INTERNAL_TXS AS INTERNAL_TXS ON INTERNAL_TXS.chain_id = TXS.chain_id AND INTERNAL_TXS.transactionHash = TXS.hash  
                     WHERE TXS.chain_id=? AND INTERNAL_TXS.internalTxs IS NULL ORDER BY blockNumber+0 DESC LIMIT 1`;
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId]);
        return { transactionHash: result?.[0]?.transactionHash, address: result?.[0]?.address };
    }

    async updateInternalTx(chainId, address, txhash, internalTxs) {
        if (!internalTxs) {
            return;
        }
        const json = JSON.stringify(internalTxs);
        const sql = 'INSERT INTO ENTRY_POINT_INTERNAL_TXS(chain_id,address,transactionHash,internalTxs) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE internalTxs=VALUES(internalTxs)';
        await ConnectionManager.getInstance().querySql(sql, [chainId, address, txhash, json]);
    }

}

const instance = new InternalTxsManager();
export default instance;
