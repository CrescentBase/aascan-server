import ConnectionManager from '../apiserver/ConnectionManager.js';
import { getLogger } from '../config/LoggerUtils.js';
import utils from "util";
import { ethers } from "ethers";
import {getBaseHeaders, timeoutFetch} from "../utils/FetchUtils.js";
import {getChainId} from "../utils/NetworkUtils.js";

const logger = getLogger("EntryPointManager");

class EntryPointManager {
    intervalTime = 8 * 1000;

    dataParams = ["uint256", "bool", "uint256", "uint256"];
    dataParamsAccountDeployed = ["address", "address"];
    dataParamsRevertReason = ["uint256", "bytes"];
    userOpsParams = ["tuple(address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes)[]", "address"];


    METHOD_ID_HANDLE_OPS = '0x1fad948c';
    METHOD_ID_HANDLE_AGGREGATED_OPS = '0x4b1d7cf5';

    abiCoder = new ethers.utils.AbiCoder()

    async init() {
        setTimeout(async () => {
            await this.intervalTask();
            this.init()
        }, this.intervalTime);
    }

    async intervalTask() {
        // logger.info("intervalTask start")
        const allEntry = await this.getAllEntryPoint();
        if (!allEntry?.length) {
            logger.info("load EntryPoint is null");
            return;
        }
        const infos = await this.getAllScanInfo();
        if (!infos) {
            logger.info("load ScanInfo is null");
            return;
        }
        for (const entry of allEntry) {
            const address = entry.address.toLowerCase();
            try {
                const supportChains = JSON.parse(entry.support_chains);//[{ chainId, block  }]
                for (const chainInfo of supportChains) {
                    const scanInfo = infos[chainInfo.chainId];
                    if (!scanInfo) {
                        logger.info("intervalTask, not support scan, chainId", chainInfo.chainId);
                    }
                    let fromBlock = chainInfo.block || 0;
                    const maxBlock = await this.getMaxBlockNumberOfLogs(chainInfo.chainId, address);
                    if (fromBlock < maxBlock - 10) {
                        fromBlock = maxBlock - 10;
                    }
                    let logs = await this.fetchScanLogs(scanInfo.url, address, fromBlock, scanInfo.key);
                    if (logs) {
                        await this.processEventLogs(entry.uo_event_topic, chainInfo.chainId, logs);
                        await this.processAccountDeployedLogs(entry.account_deployed_topic, chainInfo.chainId, logs);
                        await this.processRevertReasonLogs(entry.uo_revert_reason_topic, chainInfo.chainId, logs);
                    }

                    let fromBlockTxs = chainInfo.block || 0;
                    const maxBlockTxs = await this.getMaxBlockNumberOfTxs(chainInfo.chainId, address);
                    if (fromBlockTxs < maxBlockTxs - 10) {
                        fromBlockTxs = maxBlockTxs - 10;
                    }
                    let txs = await this.fetchScanTxs(scanInfo.url, address, fromBlockTxs, scanInfo.key);
                    txs = txs?.map(tx => { return { chain_id: chainInfo.chainId, ...tx }});
                    logger.info("intervalTask load txs", txs?.length)
                    if (txs?.length) {
                        await this.processUserOperationInfo(address, txs);
                        await this.insertTxs(address, txs);
                    }
                }
            } catch (e) {
                logger.error('intervalTask e:', utils.inspect(e));
            }
        }
    }



    async fetchScanLogs(url, address, fromBlock, key) {
        // https://api.etherscan.io/api?module=logs&action=getLogs&address=0x0576a174D229E3cFA37253523E645A78A0C91B57&fromBlock=12878196&page=1&offset=1000
        let scanUrl = `${url}/api?module=logs&action=getLogs&address=${address}&apikey=${key}`;
        if (fromBlock > 0) {
            scanUrl = `${scanUrl}&fromBlock=${fromBlock}`;
        }
        try {
            const response = await timeoutFetch(scanUrl,  {
                method: 'GET',
                headers: getBaseHeaders()
            });
            const data = await response.json();
            // console.log("fetchScanLogs scanUrl:", scanUrl, data);
            return data?.result || [];
        } catch (e) {
            logger.warn("fetchScanLogs scanUrl", scanUrl, utils.inspect(e));
        }
        return [];
    }

    async fetchScanTxs(url, address, fromBlock, key) {
        // https://api.bscscan.com/api?module=account&action=txlist&address=0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789&startblock=0
        let scanUrl = `${url}/api?module=account&action=txlist&address=${address}&apikey=${key}`;
        if (fromBlock > 0) {
            scanUrl = `${scanUrl}&fromBlock=${fromBlock}`;
        }
        // console.log("fetchScanTxs scanUrl", scanUrl);
        try {
            const response = await timeoutFetch(scanUrl, {
                method: 'GET',
                headers: getBaseHeaders()
            });
            const data = await response.json();
            // console.log("fetchScanTxs scanUrl:", scanUrl, data);
            return data?.result || [];
        } catch (e) {
            logger.warn("fetchScanTxs e", utils.inspect(e));
        }
        return [];
    }

    async processRevertReasonLogs(topic, chainId, logs) {
        logs = logs.filter(log => log.topics?.[0] === topic);
        logs = logs?.map(log => {
            let nonce = "0";
            let revertReason = "";
            try {
                const decodeData = this.abiCoder.decode(this.dataParamsRevertReason, log.data);
                nonce = decodeData[0].toString();
                revertReason = decodeData[1];
            } catch (e) {
                logger.info("processRevertReasonLogs decode fail", log.data, utils.inspect(e));
            }
            return {
                ...log,
                chain_id: chainId,
                userOpHash: log.topics?.[1] || '0x',
                sender: "0x" + log.topics?.[2]?.substring(26),
                nonce,
                revertReason,
            };
        });
        logger.info("processRevertReasonLogs logs", logs?.length)
        if (logs?.length) {
            await this.insertRevertReasonLogs(logs);
        }
    }

    async processAccountDeployedLogs(topic, chainId, logs) {
        logs = logs.filter(log => log.topics?.[0] === topic);
        logs = logs?.map(log => {
            let factory = "0x";
            let paymaster = "0x";
            try {
                const decodeData = this.abiCoder.decode(this.dataParamsAccountDeployed, log.data);
                factory = decodeData[0];
                paymaster = decodeData[1];
            } catch (e) {
                logger.info("processAccountDeployedLogs decode fail", log.data, utils.inspect(e));
            }
            return {
                ...log,
                chain_id: chainId,
                factory,
                paymaster,
                userOpHash: log.topics?.[1] || '0x',
                sender: "0x" + log.topics?.[2]?.substring(26),
            };
        });
        logger.info("processAccountDeployedLogs logs", logs?.length)
        if (logs?.length) {
            await this.insertAccountDeployedLogs(logs);
        }
    }

    async processEventLogs(topic, chainId, logs) {
        logs = logs.filter(log => log.topics?.[0] === topic);
        logs = logs?.map(log => {
            let nonce = "0";
            let success = "1";
            let actualGasCost = "0";
            let actualGasUsed = "0";
            try {
                const decodeData = this.abiCoder.decode(this.dataParams, log.data);
                nonce = decodeData[0].toString();
                success = decodeData[1] ? '1' : '0';
                actualGasCost = decodeData[2].toString();
                actualGasUsed = decodeData[3].toString();
            } catch (e) {
                logger.info("processEventLogs decode fail", log.data, utils.inspect(e));
            }
            return {
                ...log,
                chain_id: chainId,
                userOpHash: log.topics?.[1] || "0x",
                sender: "0x" + log.topics?.[2]?.substring(26),
                paymaster: "0x" + log.topics?.[3]?.substring(26),
                nonce,
                success,
                actualGasCost,
                actualGasUsed,
                blockNumber: Number(log.blockNumber || 0).toString(),
                timeStamp: Number(log.timeStamp || 0).toString(),
                gasPrice: Number(log.gasPrice || 0).toString(),
                gasUsed: Number(log.gasUsed || 0).toString(),
                logIndex: Number(log.logIndex || 0).toString()
            };
        });
        logger.info("processEventLogs logs", logs?.length)
        if (logs?.length) {
            await this.insertLogs(logs);
        }
    }


    async processUserOperationInfo(address, txs) {
        const infos = [];
        txs.forEach(tx => {
            const transactionHash = tx.hash;
            const chain_id = tx.chain_id;
            try {
                if (!tx.input || !(tx.input.startsWith(this.METHOD_ID_HANDLE_OPS) || tx.input.startsWith(this.METHOD_ID_HANDLE_AGGREGATED_OPS))) {
                    return;
                }
                const decodedInput = this.abiCoder.decode(this.userOpsParams, "0x" + tx.input.slice(10));
                const beneficiary = decodedInput[1];
                const userOpInfo = decodedInput[0][0];
                const sender = userOpInfo[0];
                const nonce = userOpInfo[1].toString();
                const initCode = userOpInfo[2];
                const callData = userOpInfo[3];
                const callGasLimit = userOpInfo[4].toString();
                const verificationGasLimit = userOpInfo[5].toString();
                const preVerificationGas = userOpInfo[6].toString();
                const maxFeePerGas = userOpInfo[7].toString();
                const maxPriorityFeePerGas = userOpInfo[8].toString();
                const paymasterAndData = userOpInfo[9];
                const signature = userOpInfo[10];

                let factory = '0x';
                if (initCode && initCode.length >= 42) {
                    factory = initCode.substring(0, 42);
                }

                infos.push({
                    chain_id,
                    address,
                    transactionHash,
                    sender,
                    nonce,
                    initCode,
                    callData,
                    callGasLimit,
                    verificationGasLimit,
                    preVerificationGas,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    paymasterAndData,
                    signature,
                    beneficiary,
                    factory
                });
            } catch (e) {
                logger.info("processUserOperationInfo e", utils.inspect(e), chain_id, transactionHash, tx?.input);
            }
        });

        if (infos.length > 0) {
            await this.insertUserOperationInfo(infos);
        }
    }


    async getMaxBlockNumberOfLogs(chainId, address) {
        const sql = 'SELECT MAX(blockNumber) AS max FROM ENTRY_POINT_LOGS WHERE chain_id=? AND address=?';
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId, address]);
        return result?.[0]?.max || 0;
    }

    async getMaxBlockNumberOfTxs(chainId, address) {
        const sql = 'SELECT MAX(blockNumber) AS max FROM ENTRY_POINT_TXS WHERE chain_id=? AND address=?';
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId, address]);
        return result?.[0]?.max || 0;
    }

    async getAllEntryPoint() {
        const sql = 'SELECT address,name,support_chains,uo_event_topic,account_deployed_topic,uo_revert_reason_topic FROM ENTRY_POINT_CONFIG';
        return await ConnectionManager.getInstance().querySql(sql);
    }

    async getAllScanInfo() {
        const sql = 'SELECT * FROM SCAN_CONFIG';
        const result = await ConnectionManager.getInstance().querySql(sql);
        if (!result?.length) {
            return undefined;
        }
        const infos = {};
        for (const info of result) {
            infos[info.chain_id] = { url: info.scan_url, key: info.api_key };
        }
        return infos;
    }


    async getScanInfo(chainId) {
        const sql = 'SELECT chain_id AS chainId, scan_url AS url, api_key AS key FROM SCAN_CONFIG WHERE chain_id=?';
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId]);
        return result?.[0];
    }

    async getUserOpsTotal(chainId) {
        const sql = `SELECT COUNT(*) AS userOpsTotal FROM ENTRY_POINT_LOGS WHERE chain_id=?`;
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId]);
        return result?.[0]?.userOpsTotal || 0;
    }

    async getEntryPointOpCount(chainId, address) {
        const sql = `SELECT COUNT(*) AS userOpsTotal FROM ENTRY_POINT_LOGS WHERE chain_id=? AND address=?`;
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId, address]);
        return result?.[0]?.userOpsTotal || 0;
    }

    async getEntryPointLastOp(chainId, address) {
        const sql = `SELECT blockNumber, timeStamp AS blockTime FROM ENTRY_POINT_LOGS  WHERE chain_id=? AND address=? ORDER BY timeStamp+0 DESC limit 1`;
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId, address]);
        return result?.[0] || {};
    }

    async allEntryPoint(chainId, network) {
        const allEntry = await this.getAllEntryPoint();
        if (!allEntry) {
            return { total: 0, entryPoint: [] };
        }
        const result = [];
        for (const entry of allEntry) {
            const ep = entry.address.toLowerCase();
            const count = await this.getEntryPointOpCount(chainId, ep);
            const op = await this.getEntryPointLastOp(chainId, ep);
            result.push({
                address: entry.address,
                name: entry.name,
                ops: count,
                blockNumber: op.blockNumber,
                blockTime: op.blockTime,
                network
            });
        }

        return { total: allEntry.length, entryPoint: result };
    }

    async getAddressActivity(network, chainId, address, first, skip) {
        const detail = {
            type: "Unknown",
            address,
            userOps: [],
            network,
            total: 0
        };
        if (!address || !ethers.utils.isAddress(address)) {
            return detail;
        }
        let result = await this.getEntryPointActivity(network, chainId, address, first, skip);
        if (result?.userOps?.length > 0) {
            detail.type = "EntryPoint";
            detail.userOps = result.userOps;
            detail.total = result.total;
            return detail;
        }
        result = await this.getPaymasterActivity(network, chainId, address, first, skip);
        if (result?.userOps?.length > 0) {
            detail.type = "Paymaster";
            detail.userOps = result.userOps;
            detail.total = result.total;
            return detail;
        }
        result = await this.getBundlerActivity(network, chainId, address, first, skip);
        if (result?.userOps?.length > 0) {
            detail.type = "Bundler";
            detail.userOps = result.userOps;
            detail.total = result.total;
            return detail;
        }
        result = await this.getBeneficiaryActivity(network, chainId, address, first, skip);
        if (result?.userOps?.length > 0) {
            detail.type = "Beneficiary";
            detail.userOps = result.userOps;
            detail.total = result.total;
            return detail;
        }
        result = await this.getSenderActivity(network, chainId, address, first, skip);
        if (result?.userOps?.length > 0) {
            detail.type = "Sender";
            detail.userOps = result.userOps;
            detail.total = result.total;
            return detail;
        }
        return detail;
    }

    async getBlockActivity(network, chainId, blockNumber) {
        const sql = `SELECT 
                        LOGS.paymaster as paymaster,
                        LOGS.address as entryPoint,
                        LOGS.userOpHash as userOpHash,
                        LOGS.nonce AS nonce, 
                        LOGS.transactionHash AS transactionHash, 
                        LOGS.success AS success, 
                        LOGS.sender AS sender, 
                        LOGS.actualGasCost AS actualGasCost, 
                        LOGS.actualGasUsed AS actualGasUsed, 
                        LOGS.blockNumber AS blockNumber,
                        LOGS.blockHash AS blockHash,
                        LOGS.timeStamp AS blockTime,
                        LOGS.gasPrice AS gasPrice,
                        LOGS.gasUsed AS gasUsed 
                     FROM ENTRY_POINT_LOGS AS LOGS 
                     WHERE LOGS.chain_id=? AND LOGS.blockNumber=?
                     ORDER BY LOGS.timeStamp+0 DESC`;
        let result = await ConnectionManager.getInstance().querySql(sql, [chainId, blockNumber]);
        result = result?.map(uo => {return { ...uo, success: uo.success !== "0", network };});
        return result || [];
    }

    async getBeneficiaryActivity(network, chainId, address, first, skip) {
        const sqlTotal = `SELECT count(*) as total FROM USER_OPERATION_INFO WHERE chain_id=? AND beneficiary=?`;
        const totalResult = await ConnectionManager.getInstance().querySql(sqlTotal, [chainId, address]);
        const total = totalResult?.[0]?.total || 0;
        if (total <= 0) {
            return { total, userOps: [] };
        }

        const sql = `
                     SELECT 
                        LOGS.paymaster as paymaster,
                        LOGS.address as entryPoint,
                        LOGS.userOpHash as userOpHash,
                        LOGS.nonce AS nonce, 
                        LOGS.transactionHash AS transactionHash, 
                        LOGS.success AS success, 
                        LOGS.sender AS sender, 
                        LOGS.actualGasCost AS actualGasCost, 
                        LOGS.actualGasUsed AS actualGasUsed, 
                        LOGS.blockNumber AS blockNumber,
                        LOGS.blockHash AS blockHash,
                        LOGS.timeStamp AS blockTime,
                        LOGS.gasPrice AS gasPrice,
                        LOGS.gasUsed AS gasUsed 
                     FROM USER_OPERATION_INFO AS UA 
                     LEFT JOIN ENTRY_POINT_LOGS AS LOGS ON UA.chain_id = LOGS.chain_id AND UA.transactionHash = LOGS.transactionHash AND UA.sender = LOGS.sender AND UA.nonce = LOGS.nonce 
                     WHERE UA.chain_id=? AND UA.beneficiary=?
                     ORDER BY LOGS.timeStamp+0 DESC 
                     LIMIT ? OFFSET ?
        `;
        let result = await ConnectionManager.getInstance().querySql(sql, [chainId, address, first, skip]);
        result = result?.map(uo => {return { ...uo, success: uo.success !== "0", network };});
        return { total, userOps: result || [] };
    }

    async getEntryPointActivity(network, chainId, address, first, skip) {
        const sqlTotal = `SELECT count(*) as total FROM ENTRY_POINT_LOGS WHERE chain_id=? AND address=?`;
        const totalResult = await ConnectionManager.getInstance().querySql(sqlTotal, [chainId, address]);
        const total = totalResult?.[0]?.total || 0;
        if (total <= 0) {
            return { total, userOps: [] };
        }

        const sql = `SELECT 
                        LOGS.paymaster as paymaster,
                        LOGS.address as entryPoint,
                        LOGS.userOpHash as userOpHash,
                        LOGS.nonce AS nonce, 
                        LOGS.transactionHash AS transactionHash, 
                        LOGS.success AS success, 
                        LOGS.sender AS sender, 
                        LOGS.actualGasCost AS actualGasCost, 
                        LOGS.actualGasUsed AS actualGasUsed, 
                        LOGS.blockNumber AS blockNumber,
                        LOGS.blockHash AS blockHash,
                        LOGS.timeStamp AS blockTime,
                        LOGS.gasPrice AS gasPrice,
                        LOGS.gasUsed AS gasUsed 
                     FROM ENTRY_POINT_LOGS AS LOGS 
                     WHERE LOGS.chain_id=? AND LOGS.address=? 
                     ORDER BY LOGS.timeStamp+0 DESC 
                     LIMIT ? OFFSET ?
               `;
        let result = await ConnectionManager.getInstance().querySql(sql, [chainId, address, first, skip]);
        result = result?.map(uo => {return { ...uo, success: uo.success !== "0", network };});
        return { total, userOps: result || [] };
    }

    async getBundlerActivity(network, chainId, address, first, skip) {
        const sqlTotal = `
            SELECT count(LOGS.sender) as total
                     FROM ENTRY_POINT_TXS AS TXS 
                     RIGHT JOIN ENTRY_POINT_LOGS AS LOGS ON TXS.chain_id = LOGS.chain_id AND TXS.hash = LOGS.transactionHash 
                     WHERE TXS.chain_id=? AND TXS.tx_from=?
        `;
        const totalResult = await ConnectionManager.getInstance().querySql(sqlTotal, [chainId, address]);
        const total = totalResult?.[0]?.total || 0;
        if (total <= 0) {
            return { total, userOps: [] };
        }

        const sql = `
            SELECT LOGS.paymaster as paymaster,
                        LOGS.address as entryPoint,
                        LOGS.userOpHash as userOpHash,
                        LOGS.nonce AS nonce, 
                        LOGS.transactionHash AS transactionHash, 
                        LOGS.success AS success, 
                        LOGS.sender AS sender, 
                        LOGS.actualGasCost AS actualGasCost, 
                        LOGS.actualGasUsed AS actualGasUsed, 
                        LOGS.blockNumber AS blockNumber,
                        LOGS.blockHash AS blockHash,
                        LOGS.timeStamp AS blockTime,
                        LOGS.gasPrice AS gasPrice,
                        LOGS.gasUsed AS gasUsed 
                     FROM ENTRY_POINT_TXS AS TXS 
                     RIGHT JOIN ENTRY_POINT_LOGS AS LOGS ON TXS.chain_id = LOGS.chain_id AND TXS.hash = LOGS.transactionHash 
                     WHERE TXS.chain_id=? AND TXS.tx_from=?
                     ORDER BY TXS.timeStamp+0 DESC 
                     LIMIT ? OFFSET ?
        `;
        let result = await ConnectionManager.getInstance().querySql(sql, [chainId, address, first, skip]);
        result = result?.map(uo => {return { ...uo, success: uo.success !== "0", network };});
        return { total, userOps: result || [] };
    }


    async getPaymasterActivity(network, chainId, address, first, skip) {
        const sqlTotal = `SELECT count(*) as total FROM ENTRY_POINT_LOGS WHERE chain_id=? AND paymaster=?`;
        const totalResult = await ConnectionManager.getInstance().querySql(sqlTotal, [chainId, address]);
        const total = totalResult?.[0]?.total || 0;
        if (total <= 0) {
            return { total, userOps: [] };
        }

        const sql = `SELECT 
                        LOGS.paymaster as paymaster,
                        LOGS.address as entryPoint,
                        LOGS.userOpHash as userOpHash,
                        LOGS.nonce AS nonce, 
                        LOGS.transactionHash AS transactionHash, 
                        LOGS.success AS success, 
                        LOGS.sender AS sender, 
                        LOGS.actualGasCost AS actualGasCost, 
                        LOGS.actualGasUsed AS actualGasUsed, 
                        LOGS.blockNumber AS blockNumber,
                        LOGS.blockHash AS blockHash,
                        LOGS.timeStamp AS blockTime,
                        LOGS.gasPrice AS gasPrice,
                        LOGS.gasUsed AS gasUsed 
                     FROM ENTRY_POINT_LOGS AS LOGS 
                     WHERE LOGS.chain_id=? AND LOGS.paymaster=? 
                     ORDER BY LOGS.timeStamp+0 DESC 
                     LIMIT ? OFFSET ?
               `;
        let result = await ConnectionManager.getInstance().querySql(sql, [chainId, address, first, skip]);
        result = result?.map(uo => {return { ...uo, success: uo.success !== "0", network };});
        return { total, userOps: result || [] };
    }

    async getSenderActivity(network, chainId, address, first, skip) {
        const sqlTotal = `SELECT count(*) as total FROM ENTRY_POINT_LOGS WHERE chain_id=? AND sender=?`;
        const totalResult = await ConnectionManager.getInstance().querySql(sqlTotal, [chainId, address]);
        const total = totalResult?.[0]?.total || 0;
        if (total <= 0) {
            return { total, userOps: [] };
        }

        const sql = `SELECT 
                        LOGS.paymaster as paymaster,
                        LOGS.address as entryPoint,
                        LOGS.userOpHash as userOpHash,
                        LOGS.nonce AS nonce, 
                        LOGS.transactionHash AS transactionHash, 
                        LOGS.success AS success, 
                        LOGS.sender AS sender, 
                        LOGS.actualGasCost AS actualGasCost, 
                        LOGS.actualGasUsed AS actualGasUsed, 
                        LOGS.blockNumber AS blockNumber,
                        LOGS.blockHash AS blockHash,
                        LOGS.timeStamp AS blockTime,
                        LOGS.gasPrice AS gasPrice,
                        LOGS.gasUsed AS gasUsed 
                     FROM ENTRY_POINT_LOGS AS LOGS 
                     WHERE LOGS.chain_id=? AND LOGS.sender=? 
                     ORDER BY LOGS.timeStamp+0 DESC 
                     LIMIT ? OFFSET ?
               `;
        let result = await ConnectionManager.getInstance().querySql(sql, [chainId, address, first, skip]);
        result = result?.map(uo => {return { ...uo, success: uo.success !== "0", network };});
        return { total, userOps: result || [] };
    }

    async getUserOpsByHash(network, chainId, allUserOpHash) {
        let strHash;
        allUserOpHash.forEach(hash => {
            if (!strHash) {
                strHash = `'${hash}'`;
            } else {
                strHash = `${strHash},'${hash}'`;
            }
        });
        const sql = `SELECT 
                        LOGS.paymaster AS paymaster,
                        LOGS.address AS entryPoint,
                        LOGS.userOpHash AS userOpHash,
                        LOGS.nonce AS nonce, 
                        LOGS.transactionHash AS transactionHash, 
                        LOGS.success AS success, 
                        LOGS.sender AS sender, 
                        LOGS.actualGasCost AS actualGasCost, 
                        LOGS.actualGasUsed AS actualGasUsed, 
                        LOGS.blockNumber AS blockNumber,
                        LOGS.blockHash AS blockHash,
                        LOGS.timeStamp AS blockTime,
                        LOGS.gasPrice AS gasPrice,
                        LOGS.gasUsed AS gasUsed,
                        REASON.revertReason AS revertReason,
                        UA.initCode AS initCode,
                        UA.callData AS callData,
                        UA.callGasLimit AS callGasLimit,
                        UA.verificationGasLimit AS verificationGasLimit,
                        UA.preVerificationGas AS preVerificationGas,
                        UA.maxFeePerGas AS maxFeePerGas,
                        UA.maxPriorityFeePerGas AS maxPriorityFeePerGas,
                        UA.paymasterAndData AS paymasterAndData,
                        UA.signature AS signature,
                        UA.beneficiary AS beneficiary,
                        UA.factory AS factory,
                        EPTXS.tx_from AS bundler,
                        EPTXS.tx_to AS ep,
                        EPTXS.input AS input,
                        TXS.internalTxs AS internalTxs 
                     FROM ENTRY_POINT_LOGS AS LOGS 
                     LEFT JOIN REVERT_REASON_LOGS AS REASON ON REASON.chain_id = LOGS.chain_id AND REASON.userOpHash = LOGS.userOpHash 
                     LEFT JOIN USER_OPERATION_INFO AS UA ON UA.chain_id = LOGS.chain_id AND UA.transactionHash = LOGS.transactionHash AND UA.sender = LOGS.sender AND UA.nonce = LOGS.nonce  
                     LEFT JOIN ENTRY_POINT_INTERNAL_TXS AS TXS ON TXS.chain_id = LOGS.chain_id AND TXS.transactionHash = LOGS.transactionHash  
                     LEFT JOIN ENTRY_POINT_TXS AS EPTXS ON EPTXS.chain_id = LOGS.chain_id AND EPTXS.hash = LOGS.transactionHash  
                     WHERE LOGS.chain_id=? AND LOGS.userOpHash IN (${strHash})
               `;
        let result = await ConnectionManager.getInstance().querySql(sql, [chainId]);
        result = result?.map(uo => {return { ...uo, success: uo.success !== "0" };});
        result = result?.map(item => {
            let internalTxs = JSON.parse(item.internalTxs);
            const sender = item.sender.toLowerCase();
            const nonce = item.nonce;
            const input = item.input;
            const signature = item.signature;
            internalTxs = internalTxs?.filter(tx => sender === tx.from?.toLowerCase() || sender === tx.to?.toLowerCase());

            let original;
            try {
                const endCode = signature.substring(2);
                const startCode = this.abiCoder.encode(['address','uint256'], [sender, nonce]).substring(2);
                original = "0x" + input.substring(input.indexOf(startCode), input.indexOf(endCode) + endCode.length);
            } catch (e) {
                original = '0x';
            }
            delete item.input;

            return {
                ...item,
                original,
                internalTxs: internalTxs || [],
                network
            }
        });
        return result || [];
    }

    async getLatestUserOps(network, chainId, first, skip) {
        const total = await this.getUserOpsTotal(chainId);
        if (total <= 0) {
            return { total, userOps: [] };
        }
        const sql = `SELECT 
                        LOGS.paymaster as paymaster,
                        LOGS.address as entryPoint,
                        LOGS.userOpHash as userOpHash,
                        LOGS.nonce AS nonce, 
                        LOGS.transactionHash AS transactionHash, 
                        LOGS.success AS success, 
                        LOGS.sender AS sender, 
                        LOGS.actualGasCost AS actualGasCost, 
                        LOGS.actualGasUsed AS actualGasUsed, 
                        LOGS.blockNumber AS blockNumber,
                        LOGS.blockHash AS blockHash,
                        LOGS.timeStamp AS blockTime,
                        LOGS.gasPrice AS gasPrice,
                        LOGS.gasUsed AS gasUsed 
                     FROM ENTRY_POINT_LOGS AS LOGS 
                     WHERE LOGS.chain_id=? 
                     ORDER BY LOGS.timeStamp+0 DESC 
                     LIMIT ? OFFSET ?`;
        let result = await ConnectionManager.getInstance().querySql(sql, [chainId, first, skip]);
        result = result?.map(uo => {return { ...uo, success: uo.success !== "0", network };});
        return { total, userOps: result || [] };
    }


    async getBundlesTotal(chainId) {
        const sql = `SELECT COUNT(*) AS bundlesTotal 
                     FROM ENTRY_POINT_TXS
                     WHERE chain_id=? AND (methodId = ? OR methodId = ?)`;
        const result = await ConnectionManager.getInstance().querySql(sql, [chainId, this.METHOD_ID_HANDLE_OPS, this.METHOD_ID_HANDLE_AGGREGATED_OPS]);
        return result?.[0]?.bundlesTotal || 0;
    }

    async getLatestBundles(network, chainId, first, skip) {
        const total = await this.getBundlesTotal(chainId);
        if (total <= 0) {
            return { total, bundles: [] };
        }
        const sql = `SELECT hash AS transactionHash, blockNumber, timeStamp AS blockTime 
                     FROM ENTRY_POINT_TXS
                     WHERE chain_id=? AND (methodId = ? OR methodId = ?) 
                     ORDER BY timeStamp+0 DESC 
                     LIMIT ? OFFSET ?`;

        let result = await ConnectionManager.getInstance().querySql(sql, [chainId, this.METHOD_ID_HANDLE_OPS, this.METHOD_ID_HANDLE_AGGREGATED_OPS, first, skip]);
        if (!result?.length) {
            return { total: 0, bundles: [] };
        }
        let strHash;
        result.forEach(item => {
            if (!strHash) {
                strHash = `'${item.transactionHash}'`;
            } else {
                strHash = `${strHash},'${item.transactionHash}'`;
            }
        });

        const opSql = `SELECT userOpHash, transactionHash FROM ENTRY_POINT_LOGS WHERE chain_id=? AND transactionHash IN (${strHash})`;
        let ops = await ConnectionManager.getInstance().querySql(opSql, [chainId]);
        ops = ops || [];
        result = result.map(item => {
            const curOps = ops.filter(op => op.transactionHash === item.transactionHash);
            return {
                userOpsLength: curOps.length,
                ...item,
                userOps: curOps.map(op => { return { userOpHash: op.userOpHash } }),
                network
            }
        });
        return { total, bundles: result || [] };
    }

    async insertRevertReasonLogs(logs) {
        const sql = 'INSERT INTO REVERT_REASON_LOGS(' +
            '    chain_id,' +
            '    address,' +
            '    userOpHash,' +
            '    sender,' +
            '    nonce,' +
            '    revertReason,' +
            '    transactionHash' +
            ') VALUES ? ON DUPLICATE KEY UPDATE' +
            ' sender=VALUES(sender)' +
            ', nonce=VALUES(nonce)' +
            ', revertReason=VALUES(revertReason)';
        try {
            let values = [];
            let count = 0;
            for (let index = 0; index < logs.length; index++) {
                const log = logs[index];
                const {
                    chain_id,
                    address,
                    userOpHash,
                    sender,
                    nonce,
                    revertReason,
                    transactionHash
                } = log;
                values.push([
                    chain_id,
                    address,
                    userOpHash,
                    sender,
                    nonce,
                    revertReason,
                    transactionHash
                ]);
                count += 1;
                if (count >= 200 || index === logs.length - 1) {
                    const result = await ConnectionManager.getInstance().querySql(sql, [values]);
                    // logger.info('insertRevertReasonLogs result:', result);
                    count = 0;
                    values = [];
                }
            }
        } catch (e) {
            logger.error('insertRevertReasonLogs e:', utils.inspect(e));
        }
    }

    async insertAccountDeployedLogs(logs) {
        const sql = 'INSERT INTO ACCOUNT_DEPLOYED_LOGS(' +
            '    chain_id,' +
            '    address,' +
            '    userOpHash,' +
            '    sender,' +
            '    paymaster,' +
            '    factory,' +
            '    transactionHash' +
            ') VALUES ? ON DUPLICATE KEY UPDATE' +
            ' sender=VALUES(sender)' +
            ', factory=VALUES(factory)' +
            ', paymaster=VALUES(paymaster)';
        try {
            let values = [];
            let count = 0;
            for (let index = 0; index < logs.length; index++) {
                const log = logs[index];
                const {
                    chain_id,
                    address,
                    userOpHash,
                    sender,
                    paymaster,
                    factory,
                    transactionHash
                } = log;
                values.push([
                    chain_id,
                    address,
                    userOpHash,
                    sender,
                    paymaster,
                    factory,
                    transactionHash
                ]);
                count += 1;
                if (count >= 200 || index === logs.length - 1) {
                    const result = await ConnectionManager.getInstance().querySql(sql, [values]);
                    // logger.info('insertAccountDeployedLogs result:', result);
                    count = 0;
                    values = [];
                }
            }
        } catch (e) {
            logger.error('insertAccountDeployedLogs e:', utils.inspect(e));
        }
    }

    async insertLogs(logs) {
        const sql = 'INSERT INTO ENTRY_POINT_LOGS(' +
            '    chain_id,' +
            '    address,' +
            '    userOpHash,' +
            '    sender,' +
            '    paymaster,' +
            '    nonce,' +
            '    success,' +
            '    actualGasCost,' +
            '    actualGasUsed,' +
            '    blockNumber,' +
            '    blockHash,' +
            '    timeStamp,' +
            '    gasPrice,' +
            '    gasUsed,' +
            '    logIndex,' +
            '    transactionHash,' +
            '    transactionIndex' +
            ') VALUES ? ON DUPLICATE KEY UPDATE' +
            ' blockNumber=VALUES(blockNumber)' +
            ', blockHash=VALUES(blockHash)';
        try {
            let values = [];
            let count = 0;
            for (let index = 0; index < logs.length; index++) {
                const log = logs[index];
                const {
                    chain_id,
                    address,
                    userOpHash,
                    sender,
                    paymaster,
                    nonce,
                    success,
                    actualGasCost,
                    actualGasUsed,
                    blockNumber,
                    blockHash,
                    timeStamp,
                    gasPrice,
                    gasUsed,
                    logIndex,
                    transactionHash,
                    transactionIndex
                } = log;
                values.push([
                    chain_id,
                    address,
                    userOpHash,
                    sender,
                    paymaster,
                    nonce,
                    success,
                    actualGasCost,
                    actualGasUsed,
                    blockNumber,
                    blockHash,
                    timeStamp,
                    gasPrice,
                    gasUsed,
                    logIndex,
                    transactionHash,
                    transactionIndex
                ]);
                count += 1;
                if (count >= 200 || index === logs.length - 1) {
                    const result = await ConnectionManager.getInstance().querySql(sql, [values]);
                    // logger.info('insertLogs result:', result);
                    count = 0;
                    values = [];
                }
            }
        } catch (e) {
            logger.error('insertLogs e:', utils.inspect(e));
        }
    }

    async insertTxs(address, txs) {
        const sql = 'INSERT INTO ENTRY_POINT_TXS(' +
            '    chain_id,' +
            '    address,' +
            '    hash,' +
            '    nonce,' +
            '    blockNumber,' +
            '    blockHash,' +
            '    transactionIndex,' +
            '    tx_from,' +
            '    tx_to,' +
            '    value,' +
            '    timeStamp,' +
            '    gas,' +
            '    gasPrice,' +
            '    isError,' +
            '    txreceipt_status,' +
            '    input,' +
            '    contractAddress,' +
            '    cumulativeGasUsed,' +
            '    gasUsed,' +
            '    confirmations,' +
            '    methodId,' +
            '    functionName' +
            ') VALUES ? ON DUPLICATE KEY UPDATE' +
            ' blockNumber=VALUES(blockNumber)' +
            ', blockHash=VALUES(blockHash)';
        try {
            let values = [];
            let count = 0;
            for (let index = 0; index < txs.length; index++) {
                const tx = txs[index];
                const {
                    chain_id,
                    hash,
                    nonce,
                    blockNumber,
                    blockHash,
                    transactionIndex,
                    from,
                    to,
                    value,
                    timeStamp,
                    gas,
                    gasPrice,
                    isError,
                    txreceipt_status,
                    input,
                    contractAddress,
                    cumulativeGasUsed,
                    gasUsed,
                    confirmations,
                    methodId,
                    functionName
                } = tx;
                values.push([
                    chain_id,
                    address,
                    hash,
                    nonce,
                    blockNumber,
                    blockHash,
                    transactionIndex,
                    from,
                    to,
                    value,
                    timeStamp,
                    gas,
                    gasPrice,
                    isError,
                    txreceipt_status,
                    input,
                    contractAddress,
                    cumulativeGasUsed,
                    gasUsed,
                    confirmations,
                    methodId,
                    functionName,
                ]);
                count += 1;
                if (count >= 200 || index === txs.length - 1) {
                    const result = await ConnectionManager.getInstance().querySql(sql, [values]);
                    // logger.info('insertTxs result:', result);
                    count = 0;
                    values = [];
                }
            }
        } catch (e) {
            logger.error('insertTxs e:', utils.inspect(e));
        }
    }

    async insertUserOperationInfo(infos) {
        const sql = 'INSERT INTO USER_OPERATION_INFO(' +
            '    chain_id,' +
            '    address,' +
            '    transactionHash,' +
            '    sender,' +
            '    nonce,' +
            '    initCode,' +
            '    callData,' +
            '    callGasLimit,' +
            '    verificationGasLimit,' +
            '    preVerificationGas,' +
            '    maxFeePerGas,' +
            '    maxPriorityFeePerGas,' +
            '    paymasterAndData,' +
            '    signature,' +
            '    beneficiary,' +
            '    factory' +
            ') VALUES ? ON DUPLICATE KEY UPDATE' +
            ' initCode=VALUES(initCode)' +
            ', callData=VALUES(callData)' +
            ', callGasLimit=VALUES(callGasLimit)' +
            ', verificationGasLimit=VALUES(verificationGasLimit)' +
            ', preVerificationGas=VALUES(preVerificationGas)' +
            ', maxFeePerGas=VALUES(maxFeePerGas)' +
            ', maxPriorityFeePerGas=VALUES(maxPriorityFeePerGas)' +
            ', paymasterAndData=VALUES(paymasterAndData)' +
            ', signature=VALUES(signature)' +
            ', beneficiary=VALUES(beneficiary)' +
            ', factory=VALUES(factory)';
        try {
            let values = [];
            let count = 0;
            for (let index = 0; index < infos.length; index++) {
                const tx = infos[index];
                const {
                    chain_id,
                    address,
                    transactionHash,
                    sender,
                    nonce,
                    initCode,
                    callData,
                    callGasLimit,
                    verificationGasLimit,
                    preVerificationGas,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    paymasterAndData,
                    signature,
                    beneficiary,
                    factory
                } = tx;
                values.push([
                    chain_id,
                    address,
                    transactionHash,
                    sender,
                    nonce,
                    initCode,
                    callData,
                    callGasLimit,
                    verificationGasLimit,
                    preVerificationGas,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    paymasterAndData,
                    signature,
                    beneficiary,
                    factory
                ]);
                count += 1;
                if (count >= 200 || index === infos.length - 1) {
                    const result = await ConnectionManager.getInstance().querySql(sql, [values]);
                    // logger.info('insertUserOperationInfo result:', result);
                    count = 0;
                    values = [];
                }
            }
        } catch (e) {
            logger.error('insertUserOperationInfo e:', utils.inspect(e));
        }
    }

}

const instance = new EntryPointManager();
export default instance;
