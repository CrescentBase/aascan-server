import express from "express";
const router = express.Router();
import {formatParam, normalResultHandler} from '../utils/RequestUtils.js';
import EntryPointManager from "../core/EntryPointManager.js";
import util from "util";

let requestMethod = router.get.bind(router);

requestMethod("/getUserOpsTotal", async (req, res) => {
    try {
        const { chainId } = formatParam(req);
        const userOpsTotal = await EntryPointManager.getUserOpsTotal(chainId);
        normalResultHandler({ userOpsTotal }, res, req, false);
    } catch(err) {
        normalResultHandler({ userOpsTotal: 0 }, res, req, false);
    }
});

requestMethod("/getLatestUserOps", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const result = await EntryPointManager.getLatestUserOps(network, chainId, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});


requestMethod("/getLatestBundles", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const result = await EntryPointManager.getLatestBundles(network, chainId, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        normalResultHandler({ total: 0, bundles: [] }, res, req, false);
    }
});

requestMethod("/getBundlesTotal", async (req, res) => {
    try {
        const { chainId } = formatParam(req);
        const bundlesTotal = await EntryPointManager.getBundlesTotal(chainId);
        normalResultHandler({ bundlesTotal }, res, req, false);
    } catch(err) {
        normalResultHandler({ bundlesTotal: 0 }, res, req, false);
    }
});


requestMethod("/getUserOp", async (req, res) => {
    try {
        const { chainId, network } = formatParam(req);
        const hash = req.query?.hash;
        if (!hash) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const allHash = hash.split(',');
        const userOps = await EntryPointManager.getUserOpsByHash(network, chainId, allHash);
        normalResultHandler({ userOps }, res, req, false);
    } catch(err) {
        console.log("getUserOp", util.inspect(err));
        normalResultHandler({ userOps: [] }, res, req, false);
    }
});

requestMethod("/getPaymasterActivity", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getPaymasterActivity(network, chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});

requestMethod("/getSenderActivity", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getSenderActivity(network, chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});


requestMethod("/getBundlerActivity", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getBundlerActivity(network, chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        console.log("getBundlerActivity", util.inspect(err));
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});

requestMethod("/getEntryPointActivity", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getEntryPointActivity(network, chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});

requestMethod("/getBeneficiaryActivity", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getBeneficiaryActivity(network, chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        console.log("getBundlerActivity", util.inspect(err));
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});

requestMethod("/getBlockActivity", async (req, res) => {
    try {
        const { chainId, network } = formatParam(req);
        const blockNumber = req.query?.blockNumber;
        if (!blockNumber) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const userOps = await EntryPointManager.getBlockActivity(network, chainId, blockNumber);
        normalResultHandler({ userOps }, res, req, false);
    } catch(err) {
        normalResultHandler({ userOps: [] }, res, req, false);
    }
});


requestMethod("/getAddressActivity", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ detail: {} }, res, req, false);
            return;
        }
        const detail = await EntryPointManager.getAddressActivity(network, chainId, address, first, skip);
        normalResultHandler({ detail }, res, req, false);
    } catch(err) {
        normalResultHandler({ detail: { type: "Unknown", userOps: [], total: 0 } }, res, req, false);
    }
});

requestMethod("/allEntryPoint", async (req, res) => {
    try {
        const entryPoint = await EntryPointManager.allEntryPoint();
        normalResultHandler({ entryPoint }, res, req, false);
    } catch(err) {
        normalResultHandler({ entryPoint: [] }, res, req, false);
    }
});


export default router;
