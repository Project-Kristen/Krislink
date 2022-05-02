const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

module.exports = (application, user, message) => {
    application.players.get(user)
      .pause(message.guildId)
      .then(() => {
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.PAUSE,
                content: 'ok|' + message.guildId
            }
        })
      })
      .catch((e) => {
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.PAUSE,
                content: 'error|' + message.guildId + '|' + e.message
            }
        })
      })
}