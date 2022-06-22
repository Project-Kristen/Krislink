const fs = require('node:fs');
const path = require('node:path');
const { Client, Intents } = require('discord.js');
const { token } = require('./.config.json');

const CommandCodes = require('../../../src/server/ws/CommandCodes');
const OPCodes = require('../../../src/server/ws/OPCodes');
const KrisClient = require('../Client');

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

bot.commands = new Map();
bot.krislink = client;

client.on('voiceStateUpdate', (payload) => {
    var guild = bot.guilds.cache.get(payload.d.guild_id)
    if (guild) {
        guild.shard.send(payload)
    }
})

const commandsPath = path.join(__dirname, 'commands');
const commandsFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		bot.once(event.name, (...args) => event.execute(bot, ...args));
	} else {
		bot.on(event.name, (...args) => event.execute(bot, ...args));
	}
}

for (const file of commandsFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    bot.commands.set(command.name, command);
}

bot.login(token);