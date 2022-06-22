const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");

const CommandCodes = require('../../../../src/server/ws/CommandCodes');
const OPCodes = require('../../../../src/server/ws/OPCodes');

module.exports = {
    name: "stop",
    data: new SlashCommandBuilder()
      .setName("stop")
      .setDescription("停止播放歌曲."),
    async execute(bot, interaction) {
        bot.krislink.send({
            type: OPCodes.COMMAND,
            data: {
                session: bot.krislink.session,
                message: {
                    op: CommandCodes.STOP,
                    guildId: interaction.member.guild.id
                }
            }
        })

        interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `停止播放 | 感謝您使用 Kristen v7!`, iconURL: bot.user.displayAvatarURL() })
                    .setColor('FF0727')
                    .setFooter({ text: `Powered By Kristen Network` })
            ]
        })
    }
}