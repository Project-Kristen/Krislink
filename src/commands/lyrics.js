const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

const getLyrics = require('../../libs/ez-music-lib/lyrics')

module.exports = async (application, user, message) => {
    user.send({
        type: OPCodes.COMMAND_RESPONSE,
        data: {
            op: CommandCodes.LYRICS,
            content: JSON.stringify(await getLyrics(message.query))
        }
    })
}