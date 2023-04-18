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
        normalResultHandler({ userOpsTotal: "0" }, res, req, false);
    }
});

requestMethod("/getLatestUserOps", async (req, res) => {
    try {
        const { chainId, first, skip } = formatParam(req);
        const userOps = await EntryPointManager.getLatestUserOps(chainId, first, skip);
        normalResultHandler({ userOps }, res, req, false);
    } catch(err) {
        normalResultHandler({ userOps: [] }, res, req, false);
    }
});


requestMethod("/getLatestBundles", async (req, res) => {
    try {
        const { chainId, first, skip } = formatParam(req);
        const bundles = await EntryPointManager.getLatestBundles(chainId, first, skip);
        normalResultHandler({ bundles }, res, req, false);
    } catch(err) {
        normalResultHandler({ bundles: [] }, res, req, false);
    }
});

requestMethod("/getBundlesTotal", async (req, res) => {
    try {
        const { chainId } = formatParam(req);
        const bundlesTotal = await EntryPointManager.getBundlesTotal(chainId);
        normalResultHandler({ bundlesTotal }, res, req, false);
    } catch(err) {
        normalResultHandler({ bundlesTotal: "0" }, res, req, false);
    }
});


requestMethod("/getUserOp", async (req, res) => {
    try {
        const { chainId } = formatParam(req);
        const hash = req.query?.hash;
        if (!hash) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const allHash = hash.split(',');
        const userOps = await EntryPointManager.getUserOpsByHash(chainId, allHash);
        normalResultHandler({ userOps }, res, req, false);
    } catch(err) {
        console.log("getUserOp", util.inspect(err));
        normalResultHandler({ userOps: [] }, res, req, false);
    }
});

requestMethod("/getPaymasterActivity", async (req, res) => {
    try {
        const { chainId, first, skip } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getPaymasterActivity(chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});

requestMethod("/getSenderActivity", async (req, res) => {
    try {
        const { chainId, first, skip } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getSenderActivity(chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});


requestMethod("/getBundlerActivity", async (req, res) => {
    try {
        const { chainId, first, skip } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getBundlerActivity(chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        console.log("getBundlerActivity", util.inspect(err));
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});

requestMethod("/getEntryPointActivity", async (req, res) => {
    try {
        const { chainId, first, skip } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getEntryPointActivity(chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});

requestMethod("/getBeneficiaryActivity", async (req, res) => {
    try {
        const { chainId, first, skip } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const result = await EntryPointManager.getBeneficiaryActivity(chainId, address, first, skip);
        normalResultHandler({ ...result }, res, req, false);
    } catch(err) {
        console.log("getBundlerActivity", util.inspect(err));
        normalResultHandler({ total: 0, userOps: [] }, res, req, false);
    }
});

requestMethod("/getBlockActivity", async (req, res) => {
    try {
        const { chainId } = formatParam(req);
        const blockNumber = req.query?.blockNumber;
        if (!blockNumber) {
            normalResultHandler({ userOps: [] }, res, req, false);
            return;
        }
        const userOps = await EntryPointManager.getBlockActivity(chainId, blockNumber);
        normalResultHandler({ userOps }, res, req, false);
    } catch(err) {
        normalResultHandler({ userOps: [] }, res, req, false);
    }
});


requestMethod("/getAddressActivity", async (req, res) => {
    try {
        const { chainId, first, skip } = formatParam(req);
        const address = req.query?.address;
        if (!address) {
            normalResultHandler({ detail: {} }, res, req, false);
            return;
        }
        const detail = await EntryPointManager.getAddressActivity(chainId, address, first, skip);
        normalResultHandler({ detail }, res, req, false);
    } catch(err) {
        normalResultHandler({ detail: { type: "Unknown", userOps: [], total: 0 } }, res, req, false);
    }
});


export default router;
