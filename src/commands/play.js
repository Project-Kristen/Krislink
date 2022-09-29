const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

module.exports = (application, user, message) => {
  var player = application.players.get(user)

  try {
    player
      .play(message.guildId, message.channelId, message.query, message.requesterId)
      .then((t) => {
        user.send({
          type: OPCodes.COMMAND_RESPONSE,
          data: {
            op: CommandCodes.PLAY,
            content: ['ok', message.guildId, player.queue.find(q => q.guildId === message.guildId).tracks.length, Buffer.from(JSON.stringify(t.toJSON()), 'utf8').toString('base64')].join('|')
          }
        })
      })
      .catch((e) => {
        application.logger.log('error', e);
        
        user.send({
          type: OPCodes.COMMAND_RESPONSE,
          data: {
            op: CommandCodes.PLAY,
            content: 'error|' + e.message
          }
        })
      })
  } catch (e) {
    application.logger.log('error', e);

    user.send({
      type: OPCodes.COMMAND_RESPONSE,
      data: {
        op: CommandCodes.PLAY,
        content: 'error|' + e.message
      }
    })
  }
}