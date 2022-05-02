const { EventEmitter } = require('stream');
const readline = require('readline');

const WebSocket = require('ws');

const Crypto = require('../../src/utils/Crypto')

const config = require('../../config.json');
const OPCodes = require('../../src/server/ws/OPCodes');

class Client extends EventEmitter {
    constructor(bot) {
        super()

        this.ws = new WebSocket(config.http.ip === "0.0.0.0" ? `ws://localhost:${config.http.port}` : `ws://${config.http.ip}:${config.http.port}`);

        this.session = null;

        this.key = {}

        bot.once('ready', () => {
            this.send({
                type: OPCodes.ACK,
                data: {
                     ack: 1
                }
            })

            this.ws.on('message', (message) => {
                var d = JSON.parse(message.toString())
                var { type, data } = d;

                if (type === OPCodes.ENCRYPTED) {
                    // Verify certificate using Crypto.verify,
                    // if it fails, close the connection
                    // if it succeeds, decrypt the message using Crypto.decrypt
                    // then JSON.parse the decrypted message
                    // after all, set the type and data to the decrypted message
                    // and continue as normal
                    if (!Crypto.verify(this.key.serverPublicKey, data.certificate, data.encryptedMessage)) {
                        this.send({
                            type: OPCodes.DO_KEY_EXCHANGE_AGAIN,
                            data: {
                                message: 'Certificate verification failed, server public key is not safe.'
                            }
                        })
                        this.ws.close()
                    }
                    else {
                        var decryptedMessage = Crypto.decrypt(this.key.clientPrivateKey, this.session, data.encryptedMessage)
                        var { type, data } = JSON.parse(decryptedMessage)
                    }
                }

                switch (type) {
                    case OPCodes.ACK:
                        this.send({
                            type: OPCodes.HELLO,
                            data: {
                                ack: data.ack,
                                userId: bot.user.id
                            }
                        })
                        break;
                    case OPCodes.HELLO:
                        console.log("Established connection with server.")
                        if (data.shouldExchangeKey) {
                            Crypto.generateKeyPair(data.keyChangeMode.type, data.keyChangeMode.bits, data.session).then(({ publicKey, privateKey }) => {
                                this.key = { clientPublicKey: publicKey, clientPrivateKey: privateKey }

                                this.send({
                                    type: OPCodes.KEY_EXCHANGE,
                                    data: {
                                        publicKey,
                                        session: data.session
                                    }
                                })
                            })
                        }
                        var session = this.session = data.session;
                        this.send({
                            type: OPCodes.OKAY,
                            data: {
                                session
                            }
                        });
                        break;
                    case OPCodes.KEY_EXCHANGE:
                        this.key.serverPublicKey = data.publicKey;
                        this.send({
                            type: OPCodes.OKAY,
                            data: {
                                session: this.session,
                                message: 'Key exchange successful.'
                            }
                        })
                        this.emit('ready', { session: this.session })
                        break;
                    case OPCodes.AUTHENTICATE_REQUIRED:
                        switch (data.type) {
                            case 'none':
                                // huh? I think this should never happen.
                                this.send(JSON.stringify({
                                    type: OPCodes.DISCONNECT,
                                    data: {
                                        reason: "Client closed.",
                                        session
                                    }
                                }))

                                this.ws.close()
                                break;
                            case 'password':
                                this.send({
                                    type: OPCodes.AUTHENTICATE,
                                    data: {
                                        account: config.authentication.config.password.account[0].username,
                                        password: config.authentication.config.password.account[0].password,
                                    }
                                })
                                break;
                            case 'publickey':
                                this.send({
                                    type: OPCodes.AUTHENTICATE,
                                    data: {
                                        account: config.authentication.config.publickey.account[0].username,
                                        password: config.authentication.config.publickey.account[0].hash,
                                    }
                                })
                                break
                        }
                        break;
                    case OPCodes.DJS_VOICE_PAYLOAD:
                        this.emit('voiceStateUpdate', data)
                        break;
                    case OPCodes.COMMAND_RESPONSE:
                        this.emit('commandResponse', data)
                        break;
                }
            })
        })
    }

    // listen event from this
    // if event's data satisfy the filter, resolve the Promise
    // if timeout reject the Promise
    // after all, clear the listener
    collect(event, filter, timeout) {
        return new Promise((resolve, reject) => {
            var out = setTimeout(() => {
                this.removeListener(event, listener)
                return reject(new Error("Timeout"))
            }, timeout)

            var listener = (data) => {
                if (filter(data)) {
                    clearTimeout(out)
                    resolve(data)
                    return this.removeListener(event, listener)
                }
            }

            this.on(event, listener)
        })
    }

    send(message) {
        console.log("[Client]", message)
        if (this.key.serverPublicKey) {
            var encryptedMessage = Crypto.encrypt(this.key.serverPublicKey, this.session, JSON.stringify(message))
            var certificate = Crypto.sign(this.key.clientPrivateKey, this.session, encryptedMessage)
            this.ws.send(JSON.stringify({
                type: OPCodes.ENCRYPTED,
                data: {
                    encryptedMessage,
                    certificate,
                    session: this.session
                }
            }))
        } else {
            this.ws.send(JSON.stringify(message))
        }
    }
}

if (module.parent) {
    module.exports = Client;
} else {
    const bot = new EventEmitter()
    const client = new Client(bot);

    bot.emit('ready')

    readline.createInterface({
        input: process.stdin,
        output: process.stdout
    }).on('line', (line) => {
        if (line.startsWith('send')) {
            var [, type, data] = line.split(' ')
            var message = {
                type: Number(type),
                data: JSON.parse(data)
            }
            client.send(message)
        } else if (line.startsWith('b64e')) {
            var a = line.split(" ").slice(1, a.length);
            console.log(Buffer.from(a).toString("base64"))
        }
    })
}
