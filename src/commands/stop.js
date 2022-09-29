const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

module.exports = (application, user, message) => {
    application.players.get(user)
      .stop(message.guildId)
      .then(() => {
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.STOP,
                content: 'ok|' + message.guildId
            }
        })
      })
      .catch((e) => {
        application.logger.log('error', e);
        
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.STOP,
                content: 'error|' + message.guildId + '|' + e.message
            }
        })
      })
}