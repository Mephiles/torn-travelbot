console.log('Starting Torn Travel bot..');

const Discord = require('discord.js');
const auth = require('./auth.json');
const TravelBot = require('./TravelBot');

const client = new Discord.Client();
const travelBot = new TravelBot(client, auth.api_key, {
	autoUpdate: true,
	channelName: 'travel-info',
	commandPrefix: '!',
	command: 'travel',
	debug: false,
	override: {
		apiKeyLength: 16,
		commandPrefixLength: 1,
		maxCommandLength: 6,
		yataUrl: `https://yata.yt/api/v1/travel/export/`,
		tornUrl: `https://api.torn.com/torn/?selections=items&key=[API-KEY]`,
		silentErrors: true,
		defaultLogsCount: 10,
		dateFormat: 'EU',
	},
});

client.on('ready', function () {
	console.log(`Logged In as ${client.user.tag}`);
});

client.on('message', function (msg) {
	travelBot.ProcessMessage(msg);
});

client.login(auth.token);
