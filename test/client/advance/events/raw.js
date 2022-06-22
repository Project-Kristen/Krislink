const OPCodes = require('../../../../src/server/ws/OPCodes');


module.exports = {
    name: "raw",
    async execute(bot, d) {
        if (["VOICE_SERVER_UPDATE", "VOICE_STATE_UPDATE"].includes(d?.t)) {
            switch (d.t) {
                case "VOICE_SERVER_UPDATE":
                    bot.krislink.send({
                        type: OPCodes.DJS_VOICE_SERVER_UPDATE,
                        data: d
                    })
                    break;
                case "VOICE_STATE_UPDATE":
                    bot.krislink.send({
                        type: OPCodes.DJS_VOICE_STATE_UPDATE,
                        data: d
                    })
                    break;
                }
        }
    }
}