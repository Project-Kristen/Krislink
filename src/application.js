const EventEmitter = require('events');

const WSServer = require('./server/ws/server');
const HttpServer = require('./server/http/server');

const WorkerPool = require('./utils/WorkerPool');
const OPCodes = require('./server/ws/OPCodes');
const CommandCodes = require('./server/ws/CommandCodes');
const { getLogger } = require('../libs/fox-logger/logger');

class Application extends EventEmitter {
    constructor(options) {
        // Call parent constructor
        super();

        // start websocket, http, and initizlize the cache, workerpool
        this.version = require('../package.json').version;

        this.users = []

        this.players = new Map()

        this.configs = options;

        this.logger = getLogger('application');

        this.workerPool = new WorkerPool(options.threadsCount);

        this.httpServer = new HttpServer(this, options.http);
        this.wsServer = new WSServer(this, this.httpServer.server, options.ws);

        this.on('command', (user, message) => {
            if (!message.op) {
                return user.send({
                    type: OPCodes.INVALID,
                    data: {
                        message: "Please provided 'op' for commands."
                    }
                });
            }

            switch (message.op) {
                case CommandCodes.SEARCH:
                    require('./commands/search')(this, user, message);
                    break;
                case CommandCodes.JOIN:
                    require('./commands/join')(this, user, message);
                    break;
                case CommandCodes.NEXT:
                    require('./commands/skip')(this, user, message);
                    break;
                case CommandCodes.PLAY:
                    require('./commands/play')(this, user, message);
                    break;
                case CommandCodes.PAUSE:
                    require('./commands/pause')(this, user, message);
                    break;
                case CommandCodes.RESUME:
                    require('./commands/resume')(this, user, message);
                    break;
                case CommandCodes.REPEAT:
                    require('./commands/loop')(this, user, message);
                    break;
                case CommandCodes.STOP:
                    require('./commands/stop')(this, user, message);
                    break;
                case CommandCodes.USAGE:
                    require('./commands/usage')(this, user, message);
                    break;
                case CommandCodes.VOLUME:
                    require('./commands/volume')(this, user, message);
                    break;
                case CommandCodes.LYRICS:
                    require('./commands/lyrics')(this, user, message);
                    break;
            }
        })

        const handler = () => {
            this.logger.log('info', "Telling client to disconnect...");
            for (const user of this.users) {
                user.send({
                    type: OPCodes.DISCONNECT,
                    data: {
                        message: "Krislink shutdowned."
                    }
                });
            }

            setTimeout(() => process.exit(0), 3000);
        }

        process.stdin.resume();

        process.once("SIGINT", handler);
        process.once("SIGTERM", handler);
        process.once("SIGHUP", handler);
        process.once("beforeExit", handler);

        this.logger.log('info', "Krislink is ready");
    }
}

module.exports = Application;