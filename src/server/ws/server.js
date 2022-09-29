const OPCodes = require('./OPCodes')

const { WebSocketServer } = require('ws');
const Crypto = require('../../utils/Crypto');
const User = require('../../user');

const { Player } = require('../../../libs/ez-music-lib');
const { getLogger } = require('../../../libs/fox-logger/logger');

module.exports = class WSServer {
    constructor(application, http, config) {
        this.app = application;
        this.config = config;

        this._ws = new WebSocketServer({
            server: http
        })

        this.verifed = new Map(); // replaced with Map for significant performance boost
        this.pingPong = new Map(); // this is for pong time-out
        this.scheduledPing = new Map(); // this is for ping.

        this.logger = getLogger('websocket');

        // If config.onlyLocal is on, we should only allow connections from localhost
        this._ws.on('connection', (ws, req) => {
            const { socket } = req;
            const remoteAddress = `${socket.address().address}:${socket.address().port}`

            if (config.onlyLocal /*&& (remoteAddress !== '::1')*/ && (!remoteAddress.includes('127.0.0.1'))) {
                this.send(ws, null, {
                    type: OPCodes.DISCONNECT,
                    data: {
                        message: 'Only local connections are allowed.'
                    }
                })
                ws.close()
            }

            // Ws on message
            ws.on('message', async message => {
                const jdata = JSON.parse(message.toString());
                jdata.type === OPCodes.ENCRYPTED ?? this.logger.log('debug', jdata);

                var { type, data } = jdata;

                if (![OPCodes.ACK, OPCodes.HELLO, OPCodes.AUTHENTICATE, OPCodes.KEY_EXCHANGE].includes(type)) {
                    if (!data.session || !this.app.users.find(user => user.session === data.session)) {
                        this.send(ws, null, {
                            type: OPCodes.NOT_AUTHENTICATED,
                            data: {
                                message: 'Invalid session.'
                            }
                        })
                        ws.close()
                        return;
                    }
                }

                const user = this.app.users.find(user => user.session === data.session);

                if (jdata.type === OPCodes.ENCRYPTED) {
                    // Verify certificate using Crypto.verify,
                    // if it fails, close the connection
                    // if it succeeds, decrypt the message using Crypto.decrypt
                    // then JSON.parse the decrypted message
                    // after all, set the type and data to the decrypted message
                    // and continue as normal
                    if (!Crypto.verify(user.clientPublicKey, data.certificate, data.encryptedMessage)) {
                        this.send(ws, null, {
                            type: OPCodes.DO_KEY_EXCHANGE_AGAIN,
                            data: {
                                message: 'Certificate verification failed, please do exchange again.'
                            }
                        })
                        ws.close()
                    }
                    else {
                        var decryptedMessage = Crypto.decrypt(user.serverPrivateKey, data.session, data.encryptedMessage)
                        var { type, data } = JSON.parse(decryptedMessage)
                        this.logger.log('debug', type, data);
                    }
                }

                switch (type) {
                    case OPCodes.ACK:
                        if (data.ack >= 2) {
                            this.send(ws, null, {
                                type: OPCodes.DISCONNECT,
                                data: {
                                    message: 'Too many ACKs, handshake failed.'
                                }
                            })
                            ws.close()
                            break;
                        }

                        if (data.ack !== 1) {
                            this.send(ws, null, {
                                type: OPCodes.DISCONNECT,
                                data: {
                                    message: 'Invalid ACK, handshake failed.'
                                }
                            })
                            ws.close()
                            break;
                        }

                        this.send(ws, null, {
                            type: OPCodes.ACK,
                            data: {
                                ack: data.ack + 1
                            }
                        })
                        break;
                    case OPCodes.AUTHENTICATE:
                        if (this.verifed.has(data.session)) {
                            this.send(ws, null, {
                                type: OPCodes.DISCONNECT,
                                data: {
                                    message: 'Session already verified.'
                                }
                            })
                            ws.close()
                            break;
                        } else {
                            var _user;
                            switch (this.app.configs.authentication.type) {
                                case 'none':
                                    // huh? I think this should never happen.
                                    ws.send(JSON.stringify({
                                        type: OPCodes.DISCONNECT,
                                        data: {
                                            reason: "Client closed.",
                                            session
                                        }
                                    }))
                                
                                    ws.close()
                                    break;
                                case 'password':
                                    _user = this.app.configs.authentication.config.password.account.find(u => u.username === data.account && u.password === data.password);
                                    if (!_user) {
                                        return this.send(ws, null, {
                                            type: OPCodes.DISCONNECT,
                                            data: {
                                                message: 'Invalid account or password.'
                                            }
                                        })
                                    }
                                    this.verifed.set(remoteAddress, true, 300);
                                    this.send(ws, null, {
                                        type: OPCodes.ACK,
                                        data: {
                                            ack: 2
                                        }
                                    }) // An hacky way to tell the client to HELLO again
                                    break;
                                case 'publickey':
                                    _user = this.app.configs.authentication.config.password.account.find(u => u.username === data.account && u.hash === data.hash);
                                    if (!_user) {
                                        return this.send(ws, null, {
                                            type: OPCodes.DISCONNECT,
                                            data: {
                                                message: 'Invalid account or password.'
                                            }
                                        })
                                    }
                                    this.verifed.set(remoteAddress, true, 300);
                                    this.send(ws, null, {
                                        type: OPCodes.ACK,
                                        data: {
                                            ack: 2
                                        }
                                    }) // An hacky way to tell the client to HELLO again
                                    break
                            }
                        }
                        break;
                    case OPCodes.HELLO:
                        if (data.ack !== 2) {
                            ws.send(JSON.stringify({
                                type: OPCodes.DISCONNECT,
                                data: {
                                    message: 'Invalid ACK, handshake failed.'
                                }
                            }))
                            ws.close()
                            break;
                        }

                        if (!data.userId) {
                            ws.send(JSON.stringify({
                                type: OPCodes.DISCONNECT,
                                data: {
                                    message: 'Invalid userId.'
                                }
                            }))
                            ws.close()
                            break;
                        }

                        if (this.app.configs.authentication.type !== 'none' && !this.verifed.has(remoteAddress)) {
                            return this.send(ws, null, {
                                type: OPCodes.AUTHENTICATE_REQUIRED,
                                data: {
                                    type: this.app.configs.authentication.type
                                }
                            })
                        }

                        this.logger.log('verbose', `User(${data.userId}) established connection successfully.`);

                        var newUser = new User(this, ws);

                        newUser.id = data.userId;

                        this.app.users.push(newUser);

                        const player = new Player(newUser, this.app.workerPool);

                        const playerLogger = getLogger('player(uid=' + data.userId + ')'); // debug

                        player.on('debug', (...info) => {
                            playerLogger.log('debug', ...info);
                        });

                        this.app.players.set(newUser, player);

                        const ping = setInterval(() => {
                            this.send(ws, null, {
                                type: OPCodes.PING,
                                data: {
                                    time: performance.now() + performance.timeOrigin
                                }
                            })

                            const pending = setTimeout(() => {
                                clearInterval(ping)
                                clearTimeout(pending)

                                this.app.users = this.app.users.filter(user => user.session !== newUser.session)
                                ws.terminate();

                                this.logger.log('verbose', "User " + newUser.session + " failed to complete ping-pong in time.")
                            }, 15000);

                            this.pingPong.set(newUser.session, pending);
                        }, 30000)

                        this.send(ws, null, {
                            type: OPCodes.HELLO,
                            data: {
                                message: 'Hello, welcome to the server.',
                                version: this.app.version,
                                session: newUser.session,
                                shouldExchangeKey: config.safeMode.enabled,
                                keyChangeMode: config.safeMode.enabled ? {
                                    type: config.safeMode.key.type,
                                    bits: config.safeMode.key.bits
                                } : undefined
                            }
                        })
                        break;
                    case OPCodes.DISCONNECT:
                        this.app.users = this.app.users.filter(user => user.session !== data.session)
                        if (this.pingPong.has(user.session)) {
                            clearTimeout(this.pingPong.get(user.session))
                            this.pingPong.delete(user.session)
                        }

                        if (this.scheduledPing.has(user.session)) {
                            clearInterval(this.scheduledPing.get(user.session))
                            this.scheduledPing.delete(user.session)
                        }
                        ws.close()
                        break;
                    case OPCodes.RECONNECT: // Imagine Client call Server to reconnect
                        this.app.users = this.app.users.filter(user => user.session !== data.session)
                        this.send(ws, data.session, {
                            type: OPCodes.RECONNECT,
                            data: {
                                message: 'Please reconnect as long as you sent me a reconnect code.'
                            }
                        })
                        break;
                    case OPCodes.KEY_EXCHANGE:
                        if (data.publicKey) {
                            // If config.safeMode.enabled is true, generate a rsa key pair and send it to the client
                            if (config.safeMode.enabled && !user.clientPublicKey) {
                                const startMs = performance.now();
                                Crypto.generateKeyPair(config.safeMode.key.type, config.safeMode.key.bits, data.session).then(({ publicKey, privateKey }) => {
                                    user.serverPublicKey = publicKey;
                                    user.serverPrivateKey = privateKey;
                                    user.clientPublicKey = data.publicKey;

                                    this.send(ws, data.session, {
                                        type: OPCodes.KEY_EXCHANGE,
                                        data: {
                                            publicKey
                                        }
                                    })
                                });

                                this.logger.log('debug', `${config.safeMode.key.bits} took ${performance.now() - startMs}ms to generate.`);
                            } else if (user) {
                                this.send(ws, data.session, {
                                    type: OPCodes.INVALID,
                                    data: {
                                        message: 'Key has been exchanged, do not send a key again.'
                                    }
                                })
                            } else {
                                // If config.safeMode.enabled is off, tell him to shut the fuck up
                                this.send(ws, data.session, {
                                    type: OPCodes.INVALID,
                                    data: {
                                        message: 'Safe mode is not on, so it is unnecessary to exchange key.'
                                    }
                                })
                            }
                        } else {
                            this.send(ws, data.session, {
                                type: OPCodes.INVALID_PUBLIC_KEY,
                                data: {
                                    message: 'Invalid public key.'
                                }
                            })
                            ws.close()
                        }
                        break;
                    case OPCodes.COMMAND:
                        if (data.message) {
                            this.app.emit('command', this.app.users.find(u => u.session === data.session), data.message); // Let application handle it instead.
                        } else {
                            this.send(ws, data.session, {
                                type: OPCodes.INVALID,
                                data: {
                                    message: 'Client didn\'t provide message, abort.'
                                }
                            })
                        }
                        break;
                    case OPCodes.PONG:
                        if (!this.pingPong.has(user.session)) return this.logger.log('verbose', "User " + user.session + " tried to pong but no ping response is required for it.");
                        clearTimeout(this.pingPong.get(user.session));
                        this.pingPong.delete(user.session);
                        this.send(ws, data.session, {
                            type: OPCodes.OKAY,
                            data: {
                                message: 'Pong recieved.'
                            }
                        })
                        break;
                    case OPCodes.PING:
                    case OPCodes.NOT_AUTHENTICATED:
                    case OPCodes.COMMAND_RESPONSE:
                    case OPCodes.NEW_SESSION:
                    case OPCodes.DO_KEY_EXCHANGE_AGAIN:
                        // todo: If invalid opcode, close the connection and block the client.
                        this.send(ws, data.session, {
                            type: OPCodes.INVALID,
                            data: {
                                message: 'Invalid Usage.'
                            }
                        })
                        break;
                    case OPCodes.ERROR:
                        this.logger.log('debug', "Got ERROR From " + remoteAddress);
                        this.send(ws, data.session, {
                            type: OPCodes.OKAY,
                            data: {
                                message: 'Error recieved.'
                            }
                        })
                        break;
                    case OPCodes.OKAY:
                        this.logger.log('debug', "Got OKAY From " + remoteAddress);
                        break;
                    case OPCodes.INVALID:
                        this.logger.log('debug', "Got INVALID From " + remoteAddress);
                        break;
                    case OPCodes.DJS_VOICE_STATE_UPDATE:
                        if (data.d.guild_id && data.d.session_id && data.d.user_id === user.id) user.adapters.get(data.d.guild_id)?.onVoiceStateUpdate(data.d)
                        break;
                    case OPCodes.DJS_VOICE_SERVER_UPDATE:
                        user.adapters.get(data.d.guild_id)?.onVoiceServerUpdate(data.d)
                        break;
                    default:
                        this.logger.log('debug', "Unknown From " + remoteAddress);
                        this.send(ws, data.session, {
                            type: OPCodes.UNKNOWN_OPCODE,
                            data: {
                                message: 'Unknown opcode.'
                            }
                        })
                        break;
                }
            })
        })
    }

    send(ws, session, data) {
        this.logger.log('debug', "[Server]", data)
        if (this.config.safeMode.enabled && session && data.type !== OPCodes.KEY_EXCHANGE) {
            var user = this.app.users.find(u => u.session === session)
            var encryptedMessage = Crypto.encrypt(user.clientPublicKey, session, JSON.stringify(data))
            var certificate = Crypto.sign(user.serverPrivateKey, session, encryptedMessage)
            ws.send(JSON.stringify({
                type: OPCodes.ENCRYPTED,
                data: {
                    encryptedMessage,
                    certificate
                }
            }))
        } else {
            ws.send(JSON.stringify(data))
        }
    }
}