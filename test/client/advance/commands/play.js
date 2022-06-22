const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");

const CommandCodes = require('../../../../src/server/ws/CommandCodes');
const OPCodes = require('../../../../src/server/ws/OPCodes');

module.exports = {
  name: "play",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("播放指定的音樂.")
    .addStringOption(builder => builder.setName("曲名").setDescription("接受 URL 或者 關鍵字.").setRequired(true)),
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
                .setAuthor({ name: `用法: /play <曲名>`, iconURL: bot.user.displayAvatarURL() })
                .setColor('FF0727')
                .setFooter({ text: `Powered By Kristen Network` })
        ]
    });

    bot.krislink.send({
        type: OPCodes.COMMAND,
        data: {
            session: bot.krislink.session,
            message: {
                op: CommandCodes.PLAY,
                channelId: interaction.member.voice.channel.id,
                guildId: interaction.member.guild.id,
                query,
                requesterId: interaction.member.id
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
  },
};
