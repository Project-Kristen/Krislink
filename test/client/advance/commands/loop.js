const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");

const CommandCodes = require('../../../../src/server/ws/CommandCodes');
const OPCodes = require('../../../../src/server/ws/OPCodes');

module.exports = {
    name: "loop",
    data: new SlashCommandBuilder()
      .setName("loop")
      .setDescription("切換單曲播放模式.")
      .addBooleanOption(builder => builder.setName("啟用").setDescription("決定是否啟用單曲播放模式, 倘若該選項未填寫, 則默認切換模式.").setRequired(false)),
    async execute(bot, interaction) {
        bot.krislink.send({
            type: OPCodes.COMMAND,
            data: {
                session: bot.krislink.session,
                message: {
                    op: CommandCodes.REPEAT,
                    guildId: interaction.member.guild.id,
                    override: interaction.options.getBoolean("啟用")
                }
            }
        })

        bot.krislink.collect('commandResponse', (data) => data.content.split("|")[1] == interaction.member.guild.id && data.op === CommandCodes.REPEAT, 5e3).then(res => {
            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setAuthor({ name: `🔂 成功 ${res.split("|")[2] === "true" ? "開啟" : "關閉"} 單曲循環功能`, iconURL: bot.user.displayAvatarURL() })
                        .setColor('FF0727')
                        .setFooter({ text: `Powered By Kristen Network` })
                ]
            })
        })
    }
}