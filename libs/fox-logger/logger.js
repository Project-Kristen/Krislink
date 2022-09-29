const SimpleFormatter = require("./formatter/simple-format");
const ConsoleTransport = require("./transports/console");

class Logger {
    constructor(options = {}) {
        this.formatter = options.formatter;
        this.tranports = options.transports ?? [];
        this.allowlist = ['fatal', 'error', 'info', 'http', 'verbose', 'debug'];
    }

    log(level, ...message) {
        if (this.allowlist.includes(level.toLowerCase())) {
            for (let transport of this.tranports) {
                transport.log(level, ...message);
            }
        }
    }

    static getLogger(name) {
        const formatter = new SimpleFormatter();
        return new Logger({
            formatter,
            transports: [
                new ConsoleTransport({
                    name,
                    formatter
                })
            ]
        });
    }

    static getExpressMiddlewareLogger(name) {
        const logger = Logger.getLogger(name);

        /**
         * @param {Request} req
         * @param {import("express").Response} res
         */
        return (req, res, next) => {
            const perf = process.hrtime.bigint();
            res.once('finish', () => {
                logger.log('http', `${req.method} ${req.url} HTTP/${req.httpVersion} ${res.statusCode} - ${(Number(process.hrtime.bigint() - perf) / 1000 / 1000).toFixed(2)}ms - ${req.headers['user-agent']}`);
            });
            next();
        }
    }
}

module.exports = Logger;