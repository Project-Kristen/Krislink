const { entersState, VoiceConnectionStatus } = require('@discordjs/voice')
const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

module.exports = (application, user, message) => {
    var vc = application.players.get(user)
        .join(message.guildId, message.channelId, message.selfDeaf)

    entersState(vc, VoiceConnectionStatus.Ready, 3e4).then(() => {
        user.connections.push(vc)
        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.JOIN,
                content: 'ok|' + message.guildId
            }
        })
    }).catch((e) => {
        application.logger.log('error', e);
        vc.destroy();

        user.send({
            type: OPCodes.COMMAND_RESPONSE,
            data: {
                op: CommandCodes.JOIN,
                content: 'err|' + message.guildId
            }
         })
    })
}