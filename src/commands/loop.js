const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

module.exports = (application, user, message) => {
    application.players.get(user)
      .loop(message.guildId)
      .then((t) => {
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.REPEAT,
                content: 'ok|' + message.guildId
            }
        })
      })
      .catch((e) => {
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.REPEAT,
                content: 'error|' + message.guildId + '|' + e.message
            }
        })
      })
}