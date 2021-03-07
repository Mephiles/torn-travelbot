# Torn: TravelBot
*Discord bot to fetch information about abroad markets from YATA*

## Setup
Add `auth.json` file with the following contents:
```
{
    "token": "[BOT-TOKEN]",
    "client_id": [BOT-CLIENT-ID],
    "api_key": "[TORN-API-KEY]"
}
```

## Dependencies
 - Discord.js
 - fetch

## Usage
Usage is simple. Initialize the bot like this:
```
const travelBot = new TravelBot(client, apiKey, options);
```
where `client` is Discord.js client, `apiKey` is Torn's API key. Available options can be found under Configuration.

## Configuration
Available options (with default values):
```
{
	autoUpdate: true,  // NB! false does not work yet
	channelName: 'travel-info',  // Channel to listen commands in
	commandPrefix: '!',  // Command prefix
	command: 'travel',  // Command itself
	debug: false,  // Enable/Disable debug mode - logs everything out in console
	override: {
		apiKeyLength: 16,  // Api key length set by Torn regulation
		commandPrefixLength: 1,  // Command prefix length
		maxCommandLength: 6,  // Maximum command length
		yataUrl: `https://yata.yt/api/v1/travel/export/`,  // YATA fetch url
		tornUrl: `https://api.torn.com/torn/?selections=items&key=[API-KEY]`,  // Torn fetch url. Must contain [API-KEY] template
		silentErrors: false,  // If exceptions should throw a stack in console or just terminate with a one-line error message
		defaultLogsCount: 10,  // Default logs count when using "!travel logs"
		dateFormat: 'EU',  // Date format
	},
}
```

**Brought to you by Gregor (Mephiles[2087524])**
