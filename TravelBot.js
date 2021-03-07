const Discord = require('discord.js');
const fetch = require('node-fetch');

class TravelBot {
	// Static options
	static API_KEY_LENGTH = 16;
	static COMMAND_PREFIX_LENGTH = 1;
	static MAX_COMMAND_LENGTH = 6;
	static YATA_URL = `https://yata.yt/api/v1/travel/export/`;
	static TORN_URL = `https://api.torn.com/torn/?selections=items&key=[API-KEY]`;
	static SILENT_ERRORS = false;
	static DEFAULT_LOGS_COUNT = 10;
	static DATE_FORMAT = 'EU';
	static BOT_NAME = 'TravelBot';

	// Options
	AUTO_UPDATE = true;
	CHANNEL_NAME = 'travel-info';
	COMMAND_PREFIX = '!';
	COMMAND = 'travel';
	DEBUG_MODE = false;

	// Necessary data
	CLIENT;
	API_KEY;
	ITEMLIST = {};
	YATA_DATA = {};
	LOGS = [];

	// Static data
	static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	static IN_MILLISECONDS = {
		day: 24 * 60 * 60 * 1000,
		hour: 60 * 60 * 1000,
		minute: 60 * 1000,
		second: 1000,
	};
	static COUNTRIES = [
		{ name: 'Mexico', key: 'mex' },
		{ name: 'Cayman Islands', abbrevation: 'ci', key: 'cay' },
		{ name: 'Canada', key: 'can' },
		{ name: 'Hawaii', key: 'haw' },
		{ name: 'United Kingdom', abbrevation: 'uk', key: 'uni' },
		{ name: 'Argentina', key: 'arg' },
		{ name: 'Switzerland', key: 'swi' },
		{ name: 'Japan', key: 'jap' },
		{ name: 'China', key: 'chi' },
		{ name: 'UAE', key: 'uae' },
		{ name: 'South Africa', abbrevation: 'sa', key: 'sou' },
	];

	constructor(client, apiKey, options) {
		this.Log(`Starting.`, { overrideDebug: true });

		try {
			TravelBot.VerifyConstructorInput(client, apiKey, options);
		} catch (err) {
			if (options?.override?.silentErrors || TravelBot.SILENT_ERRORS) {
				return this.Log(`${TravelBot.BOT_NAME} terminated with ${err}`, { overrideDebug: true });
			} else {
				throw err;
			}
		}

		// Optional options
		this.AUTO_UPDATE = 'autoUpdate' in options ? options.autoUpdate : this.AUTO_UPDATE;
		this.CHANNEL_NAME = 'ChannelName' in options ? options.ChannelName : this.CHANNEL_NAME;
		this.COMMAND_PREFIX = 'commandPrefix' in options ? options.commandPrefix : this.COMMAND_PREFIX;
		this.COMMAND = 'command' in options ? options.command : this.COMMAND;
		this.DEBUG_MODE = 'debug' in options ? options.debug : this.DEBUG_MODE;

		// Necessary options
		this.CLIENT = client;
		this.API_KEY = apiKey;

		// Override options
		if ('override' in options) {
			TravelBot.API_KEY_LENGTH =
				'apiKeyLength' in options.override ? options.override.apiKeyLength : TravelBot.API_KEY_LENGTH;
			TravelBot.DATE_FORMAT =
				'dateFormat' in options.override ? options.override.dateFormat : TravelBot.DATE_FORMAT;
			TravelBot.COMMAND_PREFIX_LENGTH =
				'commandPrefixLength' in options.override
					? options.override.commandPrefixLength
					: TravelBot.COMMAND_PREFIX_LENGTH;
			TravelBot.MAX_COMMAND_LENGTH =
				'maxCommandLength' in options.override
					? options.override.maxCommandLength
					: TravelBot.MAX_COMMAND_LENGTH;
			TravelBot.YATA_URL = 'yataUrl' in options.override ? options.override.yataUrl : TravelBot.YATA_URL;
			TravelBot.TORN_URL = 'tornUrl' in options.override ? options.override.tornUrl : TravelBot.TORN_URL;
			TravelBot.SILENT_ERRORS =
				'silentErrors' in options.override ? options.override.silentErrors : TravelBot.SILENT_ERRORS;
			TravelBot.DEFAULT_LOGS_COUNT =
				'defaultLogsCount' in options.override
					? options.override.defaultLogsCount
					: TravelBot.DEFAULT_LOGS_COUNT;
		}

		// Information
		this.Log(`Debug Mode: ${this.DEBUG_MODE ? 'enabled' : 'disabled'}`, { overrideDebug: true });
		if (this.DEBUG_MODE) {
			console.log(`-------------------------
${TravelBot.BOT_NAME}:
	API_KEY_LENGTH: ${TravelBot.API_KEY_LENGTH}
	COMMAND_PREFIX_LENGTH: ${TravelBot.COMMAND_PREFIX_LENGTH}
	MAX_COMMAND_LENGTH: ${TravelBot.MAX_COMMAND_LENGTH}
	YATA_URL: ${TravelBot.YATA_URL}
	TORN_URL: ${TravelBot.TORN_URL}
	DEFAULT_LOGS_COUNT: ${TravelBot.DEFAULT_LOGS_COUNT}
[this]:
	AUTO_UPDATE: ${this.AUTO_UPDATE}
	CHANNEL_NAME: ${this.CHANNEL_NAME}
	COMMAND_PREFIX: ${this.COMMAND_PREFIX}
	COMMAND: ${this.COMMAND}
	DEBUG_MODE: ${this.DEBUG_MODE}
	API_KEY: ${this.API_KEY}
	CLIENT: ${this.CLIENT}
			`);
		}

		// Set updater
		const updater = setInterval(() => {
			this.Update();
		}, TravelBot.IN_MILLISECONDS.minute);

		// Initial update
		this.Update();
	}

	async Update() {
		if (
			!this.ITEMLIST ||
			!this.ITEMLIST.date ||
			new Date() - this.ITEMLIST.date > 12 * TravelBot.IN_MILLISECONDS.hour
		) {
			await this.UpdateItemList();
		}
		if (
			!this.YATA_DATA ||
			!this.YATA_DATA.date ||
			new Date() - this.YATA_DATA.date > 10 * TravelBot.IN_MILLISECONDS.minute
		) {
			await this.UpdateYataData();
		}
	}

	//
	// Commands
	//

	ProcessMessage(msg) {
		// Check channel name and command prefix
		if (msg.channel.name !== this.CHANNEL_NAME || msg.content[0] !== this.COMMAND_PREFIX) return;

		const args = msg.content.replace(this.COMMAND_PREFIX, '').split(/\s/g);
		const cmd = args[0] || null;
		const subCommand = args[1] || null;
		const commandOptions = args[2] || null;

		if (cmd !== this.COMMAND) return;
		if (subCommand === null) {
			return msg.channel.send(`Missing command. Try '/travel help' to see commands.`);
		}

		const actions = {
			ping: () => {
				msg.channel.send('Pong!');
			},
			isbotup: () => {
				msg.channel.send(`Oops.. sorry.. it's not what it looks like.. What can I help you with?`);
			},
			help: () => {
				this.DisplayHelpPage(msg.channel);
			},
			'?': () => {
				this.DisplayHelpPage(msg.channel);
			},
			logs: () => {
				this.DisplayLogs(commandOptions, msg.channel);
			},
		};

		this.Log(
			`Arguments: [${args}]. Command: [${cmd}]. Sub-command: [${subCommand}]. CommandOptions: [${commandOptions}]`
		);

		if (subCommand in actions) {
			actions[subCommand]();
		} else {
			// Show warning message when in debug mode
			if (this.DEBUG_MODE) {
				msg.channel.send(
					`${TravelBot.BOT_NAME} is currently under construction. Unexpected responses may occur.`
				);
			}

			const verified = TravelBot.VerifyDataIntegrity(this.ITEMLIST, this.YATA_DATA, msg.channel);
			if (verified) this.TravelInfo(msg, subCommand, commandOptions);
		}
	}

	//
	// Travel Info
	//

	async TravelInfo(msg, subCommand, commandOptions) {
		let countryKey, countryName, itemName;
		subCommand = subCommand?.toLowerCase().replace(/,|:/g, '');
		commandOptions = commandOptions?.toLowerCase();

		const countryNamesModified = TravelBot.COUNTRIES.map((country) =>
			country.name.toLowerCase().replace(/ /g, '-')
		);
		const countryNamesAbbrevations = TravelBot.COUNTRIES.map((country) => country.abbrevation);
		const countryKeys = TravelBot.COUNTRIES.map((country) => country.key);
		const itemNamesModified = Object.keys(this.ITEMLIST.items).map((id) =>
			this.ITEMLIST.items[id].name.toLowerCase().replace(/ /g, '-')
		);

		// Country is written out
		if (countryNamesModified.includes(subCommand)) {
			this.Log('(TravelInfo) Country written out.');
			countryKey = TravelBot.COUNTRIES.find(
				(country) => country.name.toLowerCase().replace(/ /g, '-') === subCommand
			).key;
			countryName = subCommand;

			itemName = this.CheckForItem(commandOptions);
		}
		// Country is abbrevated
		else if (countryNamesAbbrevations.includes(subCommand)) {
			this.Log('(TravelInfo) Country abbrevated.');
			countryKey = TravelBot.COUNTRIES.find((country) => country.abbrevation === subCommand).key;
			countryName = TravelBot.COUNTRIES.find((country) => country.abbrevation === subCommand).name;

			itemName = this.CheckForItem(commandOptions);
		}
		// Country is written in 3-letter format
		else if (countryKeys.includes(subCommand)) {
			this.Log('(TravelInfo) Country name is in 3-letter format.');
			countryKey = subCommand;
			countryName = TravelBot.COUNTRIES.find((country) => country.abbrevation === subCommand).name;

			itemName = this.CheckForItem(commandOptions);
		}
		// No country. Item found
		else if (itemNamesModified.includes(subCommand)) {
			this.Log('(TravelInfo) No country name, item in list.');
			let itemKey = subCommand.toLowerCase();
			itemName = this.ITEMLIST.items[
				Object.keys(this.ITEMLIST.items).filter(
					(id) => this.ITEMLIST.items[id].name.toLowerCase().replace(/ /g, '-') === itemKey
				)
			].name;
		}
		// Neither was found
		else {
			this.Log(`(TravelInfo) No country/item found.`);
			msg.channel.send('Could not find Country/Item with that name.');
			return;
		}

		this.Log(`(TravelInfo) Country key: ${countryKey}`);
		this.Log(`(TravelInfo) Country name: ${countryName}`);
		this.Log(`(TravelInfo) Item name: ${itemName}`);

		this.FormatResponse(msg, countryKey, countryName, itemName);
	}

	CheckForItem(commandOptions) {
		if (commandOptions) {
			let _itemKey = commandOptions.toLowerCase();
			let _itemName = this.ITEMLIST.items[
				Object.keys(this.ITEMLIST.items).find(
					(id) => this.ITEMLIST.items[id].name.toLowerCase().replace(/ /g, '-') === _itemKey
				)
			].name;

			if (_itemName) {
				return _itemName;
			}
		}
		return undefined;
	}

	FormatResponse(msg, countryKey, countryName, itemName) {
		if (countryKey && !itemName) {
			return this.MultiplePageEmbed(msg, countryKey);
		}

		let headingText = ``;
		if (countryName) headingText = TravelBot.COUNTRIES.find((country) => country.key === countryKey).name;
		else if (itemName) headingText = itemName;

		const embed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(`${TravelBot.BOT_NAME} - ${headingText}`)
			.setFooter(`Brought to you by: Mephiles [2087524]`);

		let foundItemInCountry = false;
		for (const country in this.YATA_DATA.data.stocks) {
			if (countryKey && country !== countryKey) continue;
			for (const item of this.YATA_DATA.data.stocks[country].stocks) {
				if (item.name !== itemName) continue;
				foundItemInCountry = true;

				const updateDate = new Date(
						new Date(this.YATA_DATA.data.stocks[country].update * 1000).toUTCString().replace(' GMT', '')
					),
					month = TravelBot.MONTHS[updateDate.getMonth()],
					day = updateDate.getDate(),
					hours =
						updateDate.getHours().toString().length == 1
							? '0' + updateDate.getHours().toString()
							: updateDate.getHours(),
					minutes =
						updateDate.getMinutes().toString().length == 1
							? '0' + updateDate.getMinutes().toString()
							: updateDate.getMinutes(),
					seconds =
						updateDate.getSeconds().toString().length == 1
							? '0' + updateDate.getSeconds().toString()
							: updateDate.getSeconds(),
					cost = item.cost,
					quantity = item.quantity,
					profit = TravelBot.FormatProfit(this.ITEMLIST.items[item.id].market_value, cost);

				embed.addField(
					countryKey ? item.name : TravelBot.COUNTRIES.find((_country) => _country.key === country).name,
					`
					Cost: $${TravelBot.NumberWithCommas(cost, false)}
					Profit: ${TravelBot.NumberWithCommas(profit, false)}
					Quantity: ${TravelBot.NumberWithCommas(quantity, false)}
					Updated: ${month}, ${day}. ${hours}:${minutes}:${seconds} (Torn Time)
					(${TravelBot.TimeAgo(new Date(this.YATA_DATA.data.stocks[country].update * 1000))})
					`
				);
			}
		}

		if (countryKey && !foundItemInCountry) embed.addField('No items found', 'Item not available in this country.');
		msg.channel.send(embed);
	}

	MultiplePageEmbed(msg, countryKey) {
		const list = async (listMsg, page) => {
			const typesSorted = ['Plushie', 'Flower', 'Drug', 'Other'];

			const updateDate = new Date(
					new Date(this.YATA_DATA.data.stocks[countryKey].update * 1000).toUTCString().replace(' GMT', '')
				),
				month = TravelBot.MONTHS[updateDate.getMonth()],
				day = updateDate.getDate(),
				hours =
					updateDate.getHours().toString().length == 1
						? '0' + updateDate.getHours().toString()
						: updateDate.getHours(),
				minutes =
					updateDate.getMinutes().toString().length == 1
						? '0' + updateDate.getMinutes().toString()
						: updateDate.getMinutes(),
				seconds =
					updateDate.getSeconds().toString().length == 1
						? '0' + updateDate.getSeconds().toString()
						: updateDate.getSeconds();

			const embed = new Discord.MessageEmbed()
				.setColor('#0099ff')
				.setAuthor(
					`${TravelBot.BOT_NAME} - ${TravelBot.COUNTRIES.find((country) => country.key === countryKey).name}`
				)
				.setDescription(
					`Updated: ${month}, ${day}. ${hours}:${minutes}:${seconds} (Torn Time)
					(${TravelBot.TimeAgo(new Date(this.YATA_DATA.data.stocks[countryKey].update * 1000))})`
				)
				.setTitle(typesSorted[page - 1] == 'Other' ? typesSorted[page - 1] : typesSorted[page - 1] + 's')
				.setFooter(`Brought to you by: Mephiles [2087524]`);

			for (const item of this.YATA_DATA.data.stocks[countryKey].stocks) {
				if (!typesSorted.includes(item.item_type)) {
					item.item_type = 'Other';
				}

				if (item.item_type != typesSorted[page - 1]) {
					continue;
				}

				const name = item.name,
					cost = item.cost,
					quantity = item.quantity,
					profit = TravelBot.FormatProfit(this.ITEMLIST.items[item.id].market_value, cost);

				embed.addField(
					name,
					`
					Cost: $${TravelBot.NumberWithCommas(cost, false)}
					Profit: ${TravelBot.NumberWithCommas(profit, false)}
					Quantity: ${TravelBot.NumberWithCommas(quantity, false)}
					`
				);
			}

			if (listMsg) {
				await listMsg.edit(embed);
			} else {
				listMsg = await msg.channel.send(embed);
			}

			// Set up page reactions.
			const lFilter = (reaction, user) => reaction.emoji.name === '◀' && page !== 1 && user.id === msg.author.id;
			const lCollector = listMsg.createReactionCollector(lFilter, {
				max: 1,
			});

			lCollector.on('collect', async () => {
				rCollector.stop();
				await listMsg.reactions.removeAll();
				list(listMsg, page - 1);
			});

			const rFilter = (reaction, user) =>
				reaction.emoji.name === '▶' && typesSorted.length > page && user.id === msg.author.id;
			const rCollector = listMsg.createReactionCollector(rFilter, {
				max: 1,
			});

			rCollector.on('collect', async () => {
				lCollector.stop();
				await listMsg.reactions.removeAll();
				list(listMsg, page + 1);
			});

			if (page !== 1) await listMsg.react('◀');
			if (typesSorted.length > page) await listMsg.react('▶');
		};

		list(undefined, 1);
	}

	//
	// Fetch functions
	//

	UpdateItemList() {
		return new Promise((resolve, reject) => {
			this.Log(`Updating ITEMLIST`);

			fetch(TravelBot.TORN_URL.replace('[API-KEY]', this.API_KEY))
				.then(async (response) => {
					const result = await response.json();
					this.ITEMLIST = { items: result.items, date: new Date() };
					this.Log(`ITEMLIST updated`, { overrideDebug: true });
					return resolve();
				})
				.catch((response) => {
					this.Log(`Fetch failed: ${response}`, { overrideDebug: true });
					return resolve();
				});
		});
	}

	UpdateYataData() {
		return new Promise((resolve, reject) => {
			this.Log(`Updating YATA DATA`);

			fetch(TravelBot.YATA_URL)
				.then(async (response) => {
					let result;
					try {
						result = await response.json();
					} catch (err) {
						this.Log(`Fetch failed: [status: ${response.status}, statusText: ${response.statusText}]`, {
							overrideDebug: true,
						});
						return resolve();
					}
					const types = ['Plushie', 'Flower', 'Drug'];

					// Add types to items
					for (const country of Object.keys(result.stocks)) {
						for (const item of result.stocks[country].stocks) {
							if (types.includes(this.ITEMLIST.items[item.id].type)) {
								item.item_type = this.ITEMLIST.items[item.id].type;
							} else {
								item.item_type = 'Other';
							}
						}
					}

					this.YATA_DATA = { data: result, date: new Date() };
					this.Log(`YATA DATA updated`, { overrideDebug: true });
					return resolve();
				})
				.catch((response) => {
					this.Log(`Fetch failed: ${response}`);
					return resolve();
				});
		});
	}

	//
	// Non-Static helper functions
	//

	DisplayHelpPage(channel) {
		const commandTemplate = `${this.COMMAND_PREFIX}${this.COMMAND} [location][',' or ':' or ''] [item]`;
		const commandExamples = [
			`${this.COMMAND_PREFIX}${this.COMMAND} South-Africa`,
			`${this.COMMAND_PREFIX}${this.COMMAND} cayman-islands`,
			`${this.COMMAND_PREFIX}${this.COMMAND} ci`,
			`${this.COMMAND_PREFIX}${this.COMMAND} mexico xanax`,
			`${this.COMMAND_PREFIX}${this.COMMAND} uk, Xanax`,
			`${this.COMMAND_PREFIX}${this.COMMAND} cayman: xanax`,
			`${this.COMMAND_PREFIX}${this.COMMAND} switzerland, xanax`,
			`${this.COMMAND_PREFIX}${this.COMMAND} Xanax`,
		];

		const embed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(`${TravelBot.BOT_NAME} - Help`)
			.addField(
				commandTemplate,
				`${commandExamples.join('\n')}
		------------------
		Please write all country/item names that have spaces using hyphens`
			)
			.setFooter(`Brought to you by: Mephiles [2087524]`);
		channel.send(embed);
	}

	Log(message, options) {
		const log = {
			date: TravelBot.FormatDate(new Date()),
			message: message,
		};

		this.LOGS.push(log);

		if (this.DEBUG_MODE || options?.overrideDebug) {
			console.log(`[${TravelBot.BOT_NAME}] ${message}`);
		}
	}

	GetLogs(lastX) {
		lastX = lastX !== undefined ? lastX : TravelBot.DEFAULT_LOGS_COUNT;
		lastX = lastX > this.LOGS.length ? this.LOGS.length : lastX;
		return this.LOGS.slice(this.LOGS.length - lastX);
	}

	DisplayLogs(commandOptions, channel) {
		let lastX =
			commandOptions !== null && !isNaN(parseInt(commandOptions)) && parseInt(commandOptions) > 0
				? parseInt(commandOptions)
				: TravelBot.DEFAULT_LOGS_COUNT;
		lastX = lastX > this.LOGS.length ? this.LOGS.length : lastX;
		const logs = this.GetLogs(lastX);

		const embed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setAuthor(`${TravelBot.BOT_NAME} - Info`)
			.addField(
				`${TravelBot.BOT_NAME} logs (last ${lastX})`,
				`${logs.map((log) => `${log.date} - ${log.message}`).join('\n')}`
			)
			.setFooter(`Brought to you by: Mephiles [2087524]`);
		channel.send(embed);
	}

	//
	// Static helper functions
	//

	static VerifyConstructorInput(client, apiKey, options) {
		// Necessary data
		if (client === undefined) {
			throw new Error(`Missing 'client'.`);
		}
		if (!(client instanceof Discord.Client)) {
			throw new Error(`'client' is not instance of 'Discord.Client'.`);
		}
		if (apiKey === undefined) {
			throw new Error(`Missing 'apiKey'.`);
		}
		if (apiKey.length !== TravelBot.API_KEY_LENGTH || !apiKey.match(/^[0-9a-zA-Z]+$/)) {
			throw new Error(`API key does not match requirements`);
		}

		// Options
		if ('autoUpdate' in options) {
			if (typeof options.autoUpdate !== 'boolean') throw new Error(`Auto-update option is not type 'boolean'`);
		}
		if ('channelName' in options) {
			if (typeof options.channelName !== 'string') throw new Error(`Channel-name option is not type 'string'`);
		}
		if ('commandPrefix' in options) {
			if (typeof options.commandPrefix !== 'string') throw new Error(`Command prefix is not type 'string'.`);
			if (options.commandPrefix.length !== TravelBot.COMMAND_PREFIX_LENGTH)
				throw new Error(`Command prefix exceeds maximum allowed length.`);
		}
		if ('command' in options) {
			if (typeof options.command !== 'string') throw new Error(`Command is not type 'string'.`);
			if (!options.command.match(/^[a-z]+$/)) throw new Error(`Command can only contain letters.`);
			if (options.command.length > TravelBot.MAX_COMMAND_LENGTH)
				throw new Error(`Command exceeds maximum allowed length.`);
		}

		// Override options
		if ('override' in options) {
			if ('apiKeyLength' in options.override) {
				if (typeof options.override.apiKeyLength !== 'number') {
					throw new Error(`[Override] API key length is not type 'number'.`);
				}
				if (options.override.apiKeyLength <= 0) {
					throw new Error(`[Override] API key length can not be 0 or less.`);
				}
			}
			if ('commandPrefixLength' in options.override) {
				if (typeof options.override.commandPrefixLength !== 'number') {
					throw new Error(`[Override] Command prefix length is not type 'number'.`);
				}
				if (options.override.commandPrefixLength <= 0) {
					throw new Error(`[Override] Command prefix length can not be 0 or less.`);
				}
			}
			if ('maxCommandLength' in options.override) {
				if (typeof options.override.maxCommandLength !== 'number') {
					throw new Error(`[Override] Max command length is not type 'number'.`);
				}
				if (options.override.maxCommandLength <= 0) {
					throw new Error(`[Override] Max command length can not be 0 or less.`);
				}
			}
			if ('debug' in options.override) {
				if (typeof options.override.debug !== 'boolean') {
					throw new Error(`[Override] debug is not type 'boolean'.`);
				}
			}
			if ('silentErrors' in options.override) {
				if (typeof options.override.silentErrors !== 'boolean') {
					throw new Error(`[Override] Silent errors is not type 'boolean'.`);
				}
			}
			if ('defaultLogsCount' in options.override) {
				if (typeof options.override.defaultLogsCount !== 'number') {
					throw new Error(`[Override] Default logs count is not type 'number'.`);
				}
				if (options.override.defaultLogsCount <= 0) {
					throw new Error(`[Override] Default logs count can not be 0 or less.`);
				}
			}
			if ('dateFormat' in options.override) {
				if (typeof options.override.dateFormat !== 'string') {
					throw new Error(`[Override] Date format is not type 'string'.`);
				}
				if (!['EU', 'US', 'ISO'].includes(options.override.dateFormat)) {
					throw new Error(`[Override] Date format is not supported.`);
				}
			}
			const regexTester = new RegExp(/(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/);
			if ('yataUrl' in options.override) {
				if (typeof options.override.yataUrl !== 'string') {
					throw new Error(`[Override] Yata url is not type 'string'.`);
				}
				if (!regexTester.test(options.override.yataUrl)) {
					throw new Error(`[Override] Yata url does not match URL template.`);
				}
			}
			if ('tornUrl' in options.override) {
				if (typeof options.override.tornUrl !== 'string') {
					throw new Error(`[Override] Torn url is not type 'string'.`);
				}
				if (!options.override.tornUrl.includes('[API-KEY]')) {
					throw new Error(`[Override] Torn url does not contain API key template.`);
				}
				if (!regexTester.test(options.override.tornUrl.replace('[API-KEY]', ''))) {
					throw new Error(`[Override] Torn url does not match URL template.`);
				}
			}
		}
	}

	static VerifyDataIntegrity(ITEMLIST, YATA_DATA, channel) {
		let verified = true;

		if (!('items' in ITEMLIST) || !('date' in ITEMLIST)) {
			channel.send(`ERROR: ITEMLIST integrity check failed. Please contact Mephiles[2087524].`);
			verified = false;
		}

		if (!('data' in YATA_DATA) || !('date' in YATA_DATA) || !('stocks' in YATA_DATA.data)) {
			channel.send(`ERROR: YATA_DATA integrity check failed. Please contact Mephiles[2087524].`);
			verified = false;
		}

		return verified;
	}

	static FormatProfit(marketValue, cost) {
		if (marketValue > cost) {
			return `+$${marketValue - cost}`;
		} else if (marketValue < cost) {
			return `-$${cost - marketValue}`;
		}
		return `0`;
	}

	static NumberWithCommas(x, shorten = true) {
		if (!shorten) return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

		if (Math.abs(x) >= 1e9) {
			if (Math.abs(x) % 1e9 == 0) return (x / 1e9).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'bil';
			else return (x / 1e9).toFixed(3) + 'bil';
		} else if (Math.abs(x) >= 1e6) {
			if (Math.abs(x) % 1e6 == 0) return x / 1e6 + 'mil';
			else return (x / 1e6).toFixed(3) + 'mil';
		} else if (Math.abs(x) >= 1e3) {
			if (Math.abs(x) % 1e3 == 0) return x / 1e3 + 'k';
		}

		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	}

	static FormatDate(date) {
		const year = date.getFullYear(),
			month = (date.getMonth() + 1).toString().length !== 1 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1),
			day = date.getDate().toString().length !== 1 ? date.getDate() : '0' + date.getDate(),
			hours = date.getHours().toString().length !== 1 ? date.getHours() : '0' + date.getHours(),
			minutes = date.getMinutes().toString().length !== 1 ? date.getMinutes() : '0' + date.getMinutes(),
			seconds = date.getSeconds().toString().length !== 1 ? date.getSeconds() : '0' + date.getSeconds();

		switch (TravelBot.DATE_FORMAT) {
			case 'EU':
				return `(${day}.${month}.${year}) ${hours}:${minutes}:${seconds}`;
			case 'US':
				return `(${month}/${day}/${year}) ${hour % 12 || 12}:${minutes}:${seconds} ${hour < 12 ? 'AM' : 'PM'}`;
			case 'ISO':
				return `(${year}-${month}-${day}) ${hours}:${minutes}:${seconds}`;
			default:
				return `(${year}-${month}-${day}) ${hours}:${minutes}:${seconds}`;
		}
	}

	static TimeAgo(time) {
		switch (typeof time) {
			case 'number':
				break;
			case 'string':
				time = +new Date(time);
				break;
			case 'object':
				if (time.constructor === Date) time = time.getTime();
				break;
			default:
				time = +new Date();
		}
		var time_formats = [
			[60, 'sec', 1], // 60
			[120, '1min ago', '1min from now'], // 60*2
			[3600, 'min', 60], // 60*60, 60
			[7200, '1h ago', '1h from now'], // 60*60*2
			[86400, 'h', 3600], // 60*60*24, 60*60
			[172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
			[604800, 'd', 86400], // 60*60*24*7, 60*60*24
			[1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
			[2419200, 'w', 604800], // 60*60*24*7*4, 60*60*24*7
			[4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
			[29030400, 'mon', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
			[58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
			[2903040000, 'y', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
			[5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
			[58060800000, 'cen', 2903040000], // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
		];
		var seconds = (+new Date() - time) / 1000,
			token = 'ago',
			list_choice = 1;

		if (seconds == 0) {
			return 'Just now';
		}
		if (seconds < 0) {
			seconds = Math.abs(seconds);
			token = 'from now';
			list_choice = 2;
		}
		var i = 0,
			format;
		while ((format = time_formats[i++]))
			if (seconds < format[0]) {
				if (typeof format[2] == 'string') return format[list_choice];
				else return Math.floor(seconds / format[2]) + '' + format[1] + ' ' + token;
			}
		return time;
	}
}

module.exports = TravelBot;
