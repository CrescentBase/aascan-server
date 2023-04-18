import _log4js from 'log4js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
_log4js.configure(require('./log4jsConfig.json'));
var logger = _log4js.getLogger("app");
var consoleLogger = _log4js.getLogger('console');
console.log = consoleLogger.info.bind(consoleLogger);
console.error = consoleLogger.error.bind(consoleLogger);
var httpLogger = _log4js.getLogger("http");

export const getLogger = function(name) {
    return _log4js.getLogger(name);
}

export const log4js = _log4js;