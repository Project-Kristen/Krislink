require('dotenv').config();

const { Client, Intents, MessageEmbed } = require('discord.js');
const CommandCodes = require('../../src/server/ws/CommandCodes');
const OPCodes = require('../../src/server/ws/OPCodes');
const KrisClient = require('./Client');

const bot = new Client({ intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS] })
const client = new KrisClient(bot)

var handler = () => {
    client.send({
        type: OPCodes.DISCONNECT,
        data: {
            session: client.session
        }
    })
    process.exit(0);
};

process.stdin.resume();
process.once("SIGINT", handler)
process.once("SIGTERM", handler)
process.once("SIGHUP", handler)
process.once("beforeExit", handler)

bot.once('ready', () => {
    console.log('Bot is ready!')
    let i = 0;
    function dynamicStatus() {
        bot.user.setPresence({ 
            activities: [
                { name: 'Kristen v7.0.0-dev' }
            ], 
            status: 'dnd' 
        })
    }
    dynamicStatus();
    /*setTimeout(() => {
        client.send({
            type: OPCodes.COMMAND,
            data: {
                session: client.session,
                message: {
                    op: CommandCodes.JOIN,
                    channelId: "781460452667424798",
                    guildId: "741972580860428349",
                    selfDeaf: false
                }
            }
        })
    }, 3000)*/
})

client.on('voiceStateUpdate', (payload) => {
    var guild = bot.guilds.cache.get(payload.d.guild_id)
    console.log(guild)
    if (guild) {
        guild.shard.send(payload)
    }
})

bot.on('raw', (d) => {
    if (["VOICE_SERVER_UPDATE", "VOICE_STATE_UPDATE"].includes(d?.t)) {
        switch (d.t) {
            case "VOICE_SERVER_UPDATE":
                client.send({
                    type: OPCodes.DJS_VOICE_SERVER_UPDATE,
                    data: d
                })
                break;
            case "VOICE_STATE_UPDATE":
                client.send({
                    type: OPCodes.DJS_VOICE_STATE_UPDATE,
                    data: d
                })
                break;
        }
    }
})

bot.on('messageCreate', message => {
    if (message.author.bot) return;

    if (message.content.startsWith('k7!play')) {
        client.send({
            type: OPCodes.COMMAND,
            data: {
                session: client.session,
                message: {
                    op: CommandCodes.PLAY,
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    query: message.content.substring(8),
                    requesterId: message.author.id
                }
            }
        })

        client.collect('commandResponse', (data) => data.content.split("|")[1] === message.guild.id && data.op === CommandCodes.PLAY, 5e3).then(res => {
            var data = JSON.parse(Buffer.from(res.content.split("|")[3], 'base64').toString('utf8'))

            if (Number(res.content.split("|")[2]) === 0) {
                message.channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor(`播放中 | ${data.title}`, bot.user.displayAvatarURL(), data.url)
                            .setColor('FF0727')
                            .setFooter(`Powered By Kristen Network`)
                    ]
                })
            } else {
                message.channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor(`已加入至隊列 | ${data.title}`, bot.user.displayAvatarURL(), data.url)
                            .setColor('FF0727')
                            .setFooter(`Powered By Kristen Network`)
                    ]
                })
            }
        }).catch(console.log)
    } else if (message.content.startsWith('k7!loop')) {
        client.send({
            type: OPCodes.COMMAND,
            data: {
                session: client.session,
                message: {
                    op: CommandCodes.REPEAT,
                    guildId: message.guild.id
                }
            }
        })
    } else if (message.content.startsWith('k7!search')) {
        client.send({
            type: OPCodes.COMMAND,
            data: {
                session: client.session,
                message: {
                    op: CommandCodes.SEARCH,
                    query: message.content.substring(10),
                    searchOne: false
                }
            }
        })

        client.collect('commandResponse', (data) => data.content.split("|")[0] === message.content.substring(10) && data.op === CommandCodes.SEARCH, 5e3).then(res => {
            var data = /*JSON.parse(Buffer.from(res.content.split("|")[3], 'base64').toString('utf8'))*/ res.content.split("|").map(x => {
                try {
                    return JSON.parse(Buffer.from(x, 'base64').toString('utf8'))
                } catch {
                    return false
                }
            }).filter(x => !!x)

            message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setAuthor(`搜尋結果 | ${message.content.substring(9)}`, bot.user.displayAvatarURL())
                        .setColor('FF0727')
                        .setFooter(`Powered By Kristen Network`)
                        .setDescription(data.map(d => `[${d.title}](${d.url})`).join("\n"))
                ]
            })
        }).catch(console.log)

    } else if (message.content.startsWith('k7!stop')) {
        client.send({
            type: OPCodes.COMMAND,
            data: {
                session: client.session,
                message: {
                    op: CommandCodes.STOP,
                    guildId: message.guild.id
                }
            }
        })

        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setAuthor(`停止播放 | 感謝您使用 Kristen v7!`, bot.user.displayAvatarURL())
                    .setColor('FF0727')
                    .setFooter(`Powered By Kristen Network`)
            ]
        })
    } else if (message.content.startsWith('k7!pause')) {
        client.send({
            type: OPCodes.COMMAND,
            data: {
                session: client.session,
                message: {
                    op: CommandCodes.PAUSE,
                    guildId: message.guild.id
                }
            }
        })

        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setAuthor(`暫停播放 | 感謝您使用 Kristen v7!`, bot.user.displayAvatarURL())
                    .setColor('FF0727')
                    .setFooter(`Powered By Kristen Network`)
            ]
        })
    } else if (message.content.startsWith('k7!resume')) {
        client.send({
            type: OPCodes.COMMAND,
            data: {
                session: client.session,
                message: {
                    op: CommandCodes.RESUME,
                    guildId: message.guild.id
                }
            }
        })

        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setAuthor(`繼續播放 | 感謝您使用 Kristen v7!`, bot.user.displayAvatarURL())
                    .setColor('FF0727')
                    .setFooter(`Powered By Kristen Network`)
            ]
        })
    } else if (message.content.startsWith('k7!volume')) {
        client.send({
            type: OPCodes.COMMAND,
            data: {
                session: client.session,
                message: {
                    op: CommandCodes.VOLUME,
                    guildId: message.guild.id,
                    volume: Number(message.content.substring(10))
                }
            }
        })

        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setAuthor(`設定音量至 ${Number(message.content.substring(10))} | 感謝您使用 Kristen v7!`, bot.user.displayAvatarURL())
                    .setColor('FF0727')
                    .setFooter(`Powered By Kristen Network`)
            ]
        })
    }
})

bot.login(process.env.token)