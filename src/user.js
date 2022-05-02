const crypto = require("crypto")
const OPCodes = require("./server/ws/OPCodes")
const Permissions = require("./permissions/Permissions")

module.exports = class User {
    constructor(wss, ws) {
        this.wss = wss
        this.ws = ws
        this.id = null
        this.session = crypto.randomBytes(32).toString("hex")
        this.clientPublicKey = null
        this.serverPublicKey = null
        this.serverPrivateKey = null

        this.connections = []

        this.permissions = new Permissions() // temporary not used in current version, since I'm fuckin lazy.

        this.adapters = new Map()
    }

    send() {
        var args = Array.from(arguments)
        if (args.length === 1) {
            this.wss.send(this.ws, this.session, args[0])
        } else {
            this.wss.send(...arguments)
        }
    }

    disconnect(reason = "Unknown") {
        this.ws.send(JSON.stringify({
            type: OPCodes.DISCONNECT,
            data: {
                reason
            }
        }))
        this.ws.close()
    }
}