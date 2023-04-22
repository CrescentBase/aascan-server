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
        console.log("getUserOpsTotal", util.inspect(err));
        normalResultHandler({ userOpsTotal: 0 }, res, req, false);
    }
});

requestMethod("/getLatestUserOps", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const result = await EntryPointManager.getLatestUserOps(network, chainId, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        console.log("getLatestUserOps", util.inspect(err));
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});


requestMethod("/getLatestBundles", async (req, res) => {
    try {
        const { chainId, first, skip, network } = formatParam(req);
        const result = await EntryPointManager.getLatestBundles(network, chainId, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        console.log("getLatestBundles", util.inspect(err));
        normalResultHandler({ total: 0, bundles: [] }, res, req, false);
    }
});

requestMethod("/getBundlesTotal", async (req, res) => {
    try {
        const { chainId } = formatParam(req);
        const bundlesTotal = await EntryPointManager.getBundlesTotal(chainId);
        normalResultHandler({ bundlesTotal }, res, req, false);
    } catch(err) {
        console.log("getBundlesTotal", util.inspect(err));
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
        console.log("getPaymasterActivity", util.inspect(err));
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
        console.log("getSenderActivity", util.inspect(err));
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
        console.log("getEntryPointActivity", util.inspect(err));
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
        console.log("getBlockActivity", util.inspect(err));
        normalResultHandler({ userOps: [] }, res, req, false);
    }
});


requestMethod("/getAddressActivity", async (req, res) => {
    try {
        const { chainId, first, skip, network, type } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ detail: {} }, res, req, false);
            return;
        }
        const detail = await EntryPointManager.getAddressActivity(network, chainId, address, first, skip, type);
        normalResultHandler({ detail }, res, req, false);
    } catch(err) {
        console.log("getAddressActivity", util.inspect(err));
        normalResultHandler({ detail: { type: "Unknown", userOps: [], total: 0 } }, res, req, false);
    }
});

requestMethod("/allEntryPoint", async (req, res) => {
    try {
        const { chainId, network } = formatParam(req);
        const result = await EntryPointManager.allEntryPoint(chainId, network);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        console.log("allEntryPoint", util.inspect(err));
        normalResultHandler({ total: 0, entryPoint: [] }, res, req, false);
    }
});


export default router;
