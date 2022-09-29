const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

module.exports = (application, user, message) => {
    application.players.get(user)
      .resume(message.guildId)
      .then(() => {
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.RESUME,
                content: 'ok|' + message.guildId
            }
        })
      })
      .catch((e) => {
        application.logger.log('error', e);
        
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.RESUME,
                content: 'error|' + message.guildId + '|' + e.message
            }
        })
      })
}