const CommandCodes = require('../server/ws/CommandCodes')
const OPCodes = require('../server/ws/OPCodes')

module.exports = async (application, user, message) => {
    const cpu = await require('systeminformation').cpu()
    user.send({
        type: OPCodes.COMMAND_RESPONSE,
        data: {
            op: CommandCodes.USAGE,
            content: JSON.stringify({
                cpu: {
                    cores: cpu.physicalCores,
                    threads: cpu.cores,
                    speed: cpu.speed,
                    maxSpeed: cpu.speedMax,
                    minSpeed: cpu.speedMin,
                    name: `${cpu.manufacturer} ${cpu.brand} (${cpu.cores}) @ ${Number(cpu.speedMax).toFixed(3)}GHz`
                },
                memory: {
                    memory: require('os').freemem(),
                    totalMemory: require('os').totalmem(),
                    usage: process.memoryUsage()
                },
                uptime: process.uptime(),
                versions: {
                    node: process.version,
                    discordjs: require('discord.js').version,
                    krislink: application.version
                },
                users: application.users.length,
                players: application.users.map(u => u.adapters.size).reduce((a, b) => a + b, 0),
                pid: process.pid
            })
        }
    })
}