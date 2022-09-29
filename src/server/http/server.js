const http = require('http');
const express = require('express');
const { getLogger, getExpressMiddlewareLogger } = require('../../../libs/fox-logger/logger');

module.exports = class HTTPServer {
    constructor(application, config) {
        this.app = application;
        this.config = config;

        this.logger = getLogger('http');
        
        const app = express();
        /**
         * 
         * @param {http.IncomingMessage} req 
         * @param {*} res 
         * @param {*} next 
         */
        const accountMiddleWare = (req, res, next) => {
            if (req.headers.authorization) {
                for (let username in application.sessionCache) {
                    if (application.sessionCache[username].token === req.headers.authorization) {
                        req.client = username;
                        req.session = application.sessionCache[username];
                        break;
                    }
                }

                if (!res.session) {
                    res.status(401).send("Unauthorized");
                }
            } else {
                res.status(401).send('Unauthorized');
            }
            next();
        }

        app.use(express.json());

        app.use(getExpressMiddlewareLogger('http'));

        app.get('/', (req, res) => {
            res.status(200).send('Kristen-Server/' + application.version);
        })

        app.post('/api/v1/:method', accountMiddleWare)

        this.server = http.createServer(app)
        
        this.server.listen(config.port, config.ip, () => {
            this.logger.log('info', 'HTTP Server started on port ' + config.port);
        })
    }
}