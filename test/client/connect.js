const WebSocket = require('ws');

const Crypto = require('../../src/utils/Crypto')

const config = require('../../config.json');
const OPCodes = require('../../src/server/ws/OPCodes');

const ws = new WebSocket(config.http.ip === "0.0.0.0" ? `ws://${config.http.hostname}:${config.http.port}` : `ws://${config.http.ip}:${config.http.port}`);

var session = null;

var key = {}

ws.on('open', () => {
    ws.send(JSON.stringify({
        type: OPCodes.ACK,
        data: {
            ack: 1
        }
    }))
})

ws.on('message', (message) => {
    var d = JSON.parse(message.toString())
    console.log(d)
    const { type, data } = d;

    switch (type) {
        case OPCodes.ACK:
            ws.send(JSON.stringify({
                type: OPCodes.HELLO,
                data: {
                    ack: data.ack
                }
            }))
            break;
        case OPCodes.HELLO:
            console.log("Established connection with server.")
            if (data.shouldExchangeKey) {
                Crypto.generateKeyPair(data.keyChangeMode.type ?? 'rsa', data.keyChangeMode.bits ?? 4096, data.session).then(({ publicKey, privateKey }) => {
                    key = { publicKey, privateKey }

                    ws.send(JSON.stringify({
                        type: OPCodes.KEY_EXCHANGE,
                        data: {
                            publicKey
                        }
                    }))
                })
            }
            session = data.session;
            ws.send(JSON.stringify({
                type: OPCodes.OKAY,
                data: {
                    session
                }
            }));
            break;
    }
})

ws.on("close", () => {
    console.log("Connection closed.")
})

process.on('SIGINT', () => {
    ws.send(JSON.stringify({
        type: OPCodes.DISCONNECT,
        data: {
            reason: "Client closed.",
            session
        }
    }))

    ws.close()
})