import fetch from 'node-fetch';
import { getLogger } from '../config/LoggerUtils.js';
import utils from "util";

const logger = getLogger("FetchUtils");

export async function timeoutFetch(url, options = undefined, timeout = 30000) {
    return Promise.race([
        successfulFetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => {
                reject(new Error('timeout'));
            }, timeout),
        )
    ]);
}

export async function successfulFetch(request, options = undefined) {
    const response = await fetch(request, options);
    if (!response.ok) {
        throw new Error(`Fetch failed with status '${response.status}' for request '${request}'`);
    }
    return response;
}

export async function handleFetch(request, options = undefined) {
    const response = await successfulFetch(request, options);
    try {
        return await response.json();
    } catch (e) {
        throw e;
    }
}

export async function safelyExecuteWithTimeout(operation, printLog = true, timeout = 30000) {
    try {
        return await Promise.race([
            operation(),
            new Promise((_, reject) =>
                setTimeout(() => {
                    reject(new Error(`timeout: ${timeout}`));
                }, timeout),
            ),
        ]);
    } catch (error) {
        if (printLog) {
            logger.error(`safelyExecuteWithTimeout: ${utils.inspect(error)}`);
        }
        return undefined;
    }
}

export function getBaseHeaders() {
    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Android SDK built for x86 Build/OSM1.180201.023) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.92 Mobile Safari/537.36'
    }
}
