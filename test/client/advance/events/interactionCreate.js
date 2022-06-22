module.exports = {
	name: 'interactionCreate',
	execute(client, interaction) {
		const commandName = interaction.commandName;
        const command = client.commands.get(commandName);

        if (command == null) {
            return interaction.reply(":x: **未知的指令!**")
        }

        command.execute(client, interaction)
	},
};