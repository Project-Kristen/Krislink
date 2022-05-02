const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

module.exports = (application, user, message) => {
    application.players.get(user).search(message.query, { searchOne: message.searchOne ? true : false }).then(results => {
        console.log(results)
        if (message.searchOne) {
            user.send({
                type: OPCodes.COMMAND_RESPONSE,
                data: {
                    op: CommandCodes.SEARCH,
                    content: message.query + '|' + Buffer.from(JSON.stringify(results.toJSON()), 'utf8').toString('base64')
                }
            })
        } else {
            user.send({
                type: OPCodes.COMMAND_RESPONSE,
                data: {
                    op: CommandCodes.SEARCH,
                    content: message.query + '|' + results.map(r => Buffer.from(JSON.stringify(r.toJSON()), 'utf8').toString('base64')).join('|')
                }
            })
        }
    })
}