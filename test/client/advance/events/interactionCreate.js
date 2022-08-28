module.exports = {
	name: 'interactionCreate',
	execute(client, interaction) {
        if (!interaction.isCommand()) return;
        
		const commandName = interaction.commandName;
        const command = client.commands.get(commandName);

        if (command == null) {
            return interaction.reply(":x: **未知的指令!**");
        }

        return command.execute(client, interaction);
	},
};