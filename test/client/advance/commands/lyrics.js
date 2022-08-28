const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed, InteractionWebhook } = require("discord.js");

const CommandCodes = require('../../../../src/server/ws/CommandCodes');
const OPCodes = require('../../../../src/server/ws/OPCodes');

module.exports = {
  name: "lyrics",
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("搜索歌詞.")
    .addStringOption(builder => builder.setName("曲名").setDescription("接受 關鍵字.").setRequired(true)),
  async execute(bot, interaction) {

    const query = interaction.options.getString("曲名");

    if (!query) return interaction.reply({
        embeds: [
            new MessageEmbed()
                .setAuthor({ name: `用法: /lyrics <曲名>`, iconURL: bot.user.displayAvatarURL() })
                .setColor('FF0727')
                .setFooter({ text: `Powered By Kristen Network` })
        ]
    });

    bot.krislink.send({
        type: OPCodes.COMMAND,
        data: {
            session: bot.krislink.session,
            message: {
                op: CommandCodes.LYRICS,
                query
            }
        }
    })

    bot.krislink.collect('commandResponse', (data) => data.op === CommandCodes.LYRICS, 5e3).then(res => {
        console.log(Buffer.from(res.content, 'base64').toString('utf8'))
        var data = JSON.parse(Buffer.from(res.content, 'base64').toString('utf8'));

        interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: data.name })
                    .setThumbnail(data.thumbnail ?? null)
                    .setDescription("```\n" + data.lyrics + "\n```")
                    .setColor('RANDOM')
                    .setFooter({ text: '來源: ' + data.source })
            ]
        })
    }).catch(console.log)
  },
};
