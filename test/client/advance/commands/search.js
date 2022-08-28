const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");

const CommandCodes = require('../../../../src/server/ws/CommandCodes');
const OPCodes = require('../../../../src/server/ws/OPCodes');

const buttons = {
    "previous_page": (enabled) => 
      new MessageButton()
        .setCustomId("previous")
        .setDisabled(!enabled)
        .setStyle("PRIMARY")
        .setEmoji("➡️"),
    "next_page": (enabled) => 
      new MessageButton()
        .setCustomId("next")
        .setDisabled(!enabled)
        .setStyle("PRIMARY")
        .setEmoji("➡️"),
    "home_page": (enabled) =>
      new MessageButton()
        .setCustomId("home")
        .setDisabled(!enabled)
        .setStyle("SUCCESS")
        .setEmoji("🏠")
}

const emoji = {
    'youtube': '<:youtube:886961382099148860>',
    'soundcloud': '<:soundcloud:989172076260761632>'
}

module.exports = {
  name: "search",
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("搜索音樂, 並播放.")
    .addStringOption(builder => builder.setName("曲名").setDescription("接受 URL 或者 關鍵字.").setRequired(true))
    .addStringOption(builder => builder.setName("來源").setDescription("可選 YouTube/SoundCloud.").addChoices(
        { name: "YouTube", value: "youtube" },
        { name: "SoundCloud", value: "soundcloud" }
    )),
  async execute(bot, interaction) {
    if (!interaction.member.voice.channel) return interaction.reply({
        embeds: [
            new MessageEmbed()
                .setAuthor({ name: `請先加入一個語音頻道`, iconURL: bot.user.displayAvatarURL() })
                .setColor('FF0727')
                .setFooter({ text: `Powered By Kristen Network` })
        ]
    });

    if (interaction.member.guild.me.voice.channel) return interaction.reply({
        embeds: [
            new MessageEmbed()
                .setAuthor({ name: `請先將我退出語音頻道`, iconURL: bot.user.displayAvatarURL() })
                .setColor('FF0727')
                .setFooter({ text: `Powered By Kristen Network` })
        ]
    });

    const query = interaction.options.getString("曲名");

    if (!query) return interaction.reply({
        embeds: [
            new MessageEmbed()
                .setAuthor({ name: `用法: /search <曲名>`, iconURL: bot.user.displayAvatarURL() })
                .setColor('FF0727')
                .setFooter({ text: `Powered By Kristen Network` })
        ]
    });

    const source = interaction.options.getString("來源");

    bot.krislink.send({
        type: OPCodes.COMMAND,
        data: {
            session: bot.krislink.session,
            message: {
                op: CommandCodes.SEARCH,
                query,
                source,
                searchOne: false
            }
        }
    })

    bot.krislink.collect('commandResponse', (data) => data.content.split("|")[0] === query && data.op === CommandCodes.SEARCH, 5e3).then(res => {
        var data = /*JSON.parse(Buffer.from(res.content.split("|")[3], 'base64').toString('utf8'))*/ res.content.split("|").map(x => {
            try {
                return JSON.parse(Buffer.from(x, 'base64').toString('utf8'))
            } catch {
                return false
            }
        }).filter(x => !!x)

        interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `請選擇您想要播放的歌曲!`, iconURL: bot.user.displayAvatarURL() })
                    .setColor('FF0727')
                    .setFooter({ text: `Powered By Kristen Network` }),
            ],
            components: [
                new MessageActionRow()
                .addComponents(new MessageSelectMenu().setMaxValues(1).setPlaceholder("請選擇您想播放的歌曲.").setCustomId("choice").setOptions(data.slice(0, 10).map((track, i) => { 
                        return { label: track.title, value: String(i), emoji: emoji[track.source], description: track.author }
                }))),
                new MessageActionRow()
                .addComponents(buttons.previous_page(false), buttons.home_page(false), buttons.next_page(data.length / 10 < 1))
            ],
            fetchReply: true
        }).then(message => {
            var chosen = false;
            var currentPage = 0;
            var maxPage = Math.ceil(data.length / 10) - 1;
            const collector = message.createMessageComponentCollector({ filter: component => component.user.id == interaction.user.id, max: 1, time: 30000, errors: ['time'] })
            collector.on('collect', component => {
                switch (component.customId) {
                    case 'choice':
                        chosen = true;
                        bot.krislink.send({
                            type: OPCodes.COMMAND,
                            data: {
                                session: bot.krislink.session,
                                message: {
                                    op: CommandCodes.PLAY,
                                    channelId: interaction.member.voice.channel.id,
                                    guildId: interaction.member.guild.id,
                                    query: data[Number(component.values[0])].url,
                                    requesterId: interaction.member.id
                                }
                            }
                        })
                    
                        bot.krislink.collect('commandResponse', (data) => data.content.split("|")[1] === interaction.member.guild.id && data.op === CommandCodes.PLAY, 5e3).then(res => {
                            var data = JSON.parse(Buffer.from(res.content.split("|")[3], 'base64').toString('utf8'))
                    
                            if (Number(res.content.split("|")[2]) === 0) {
                                interaction.editReply({
                                    embeds: [
                                        new MessageEmbed()
                                            .setAuthor({ name: `播放中 | ${data.title}`, iconURL: bot.user.displayAvatarURL(), url: data.url })
                                            .setColor('FF0727')
                                            .setFooter({ text: `Powered By Kristen Network` })
                                    ],
                                    components: []
                                })
                            } else {
                                interaction.editReply({
                                    embeds: [
                                        new MessageEmbed()
                                            .setAuthor({ name: `已加入至隊列 | ${data.title}`, iconURL: bot.user.displayAvatarURL(), url: data.url })
                                            .setColor('FF0727')
                                            .setFooter({ text: `Powered By Kristen Network` })
                                    ],
                                    components: []
                                })
                            }
                        }).catch(console.log)

                        collector.stop();
                        break;
                    case 'home':
                        currentPage = 0;
                        interaction.editReply({
                            components: [
                                new MessageActionRow()
                                .addComponents(new MessageSelectMenu().setMaxValues(1).setPlaceholder("請選擇您想播放的歌曲.").setCustomId("choice").setOptions(data.slice(0, 10).map((track, i) => { 
                                        return { label: track.title, value: String(i), emoji: emoji[track.source], description: track.author }
                                }))),
                                new MessageActionRow()
                                .addComponents(buttons.previous_page(false), buttons.home_page(false), buttons.next_page(true))
                            ]
                        });
                        component.deferReply(true);
                        break;
                    case 'next':
                        currentPage++;
                        interaction.editReply({
                            components: [
                                new MessageActionRow()
                                .addComponents(new MessageSelectMenu().setMaxValues(1).setPlaceholder("請選擇您想播放的歌曲.").setCustomId("choice").setOptions(data.slice(currentPage * 10 === 0 ? currentPage : currentPage * 10 - 1, currentPage * 10).map((track, i) => { 
                                        return { label: track.title, value: String(i), emoji: emoji[track.source], description: track.author }
                                }))),
                                new MessageActionRow()
                                .addComponents(buttons.previous_page(true), buttons.home_page(true), buttons.next_page(currentPage !== maxPage))
                            ]
                        });
                        component.deferReply(true);
                        break;
                    case 'previous':
                        currentPage--;
                        interaction.editReply({
                            components: [
                                new MessageActionRow()
                                .addComponents(new MessageSelectMenu().setMaxValues(1).setPlaceholder("請選擇您想播放的歌曲.").setCustomId("choice").setOptions(data.slice(currentPage * 10 === 0 ? currentPage : currentPage * 10 - 1, currentPage * 10).map((track, i) => { 
                                        return { label: track.title, value: String(i), emoji: emoji[track.source], description: track.author }
                                }))),
                                new MessageActionRow()
                                .addComponents(buttons.previous_page(currentPage !== 0), buttons.home_page(currentPage !== 0), buttons.next_page(true))
                            ]
                        });
                        component.deferReply(true);
                        break;
                }
            });
            collector.on('end', () => chosen ? void 0 : interaction.deleteReply())
        })
    }).catch(console.log)

    /*

    bot.krislink.send({
        type: OPCodes.COMMAND,
        data: {
            session: bot.krislink.session,
            message: {
                op: CommandCodes.PLAY,
                channelId: interaction.member.voice.channel.id,
                guildId: interaction.member.guild.id,
                query,
                requesterId: interaction.member.id,
            }
        }
    })

    bot.krislink.collect('commandResponse', (data) => data.content.split("|")[1] === interaction.member.guild.id && data.op === CommandCodes.PLAY, 5e3).then(res => {
        var data = JSON.parse(Buffer.from(res.content.split("|")[3], 'base64').toString('utf8'))

        if (Number(res.content.split("|")[2]) === 0) {
            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setAuthor({ name: `播放中 | ${data.title}`, iconURL: bot.user.displayAvatarURL(), url: data.url })
                        .setColor('FF0727')
                        .setFooter({ text: `Powered By Kristen Network` })
                ]
            })
        } else {
            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setAuthor({ name: `已加入至隊列 | ${data.title}`, iconURL: bot.user.displayAvatarURL(), url: data.url })
                        .setColor('FF0727')
                        .setFooter({ text: `Powered By Kristen Network` })
                ]
            })
        }
    }).catch(console.log)
    */
  },
};
