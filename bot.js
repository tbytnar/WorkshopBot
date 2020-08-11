const debug = true;

const { Client, MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const Sequelize = require('sequelize');

const client = new Client();

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'workshopbot.sqlite',
});

const Guilds = sequelize.define('guilds', {
	guild_id: {
		type: Sequelize.STRING(24),
		primaryKey: true,
	},
	collection_id: {
		type: Sequelize.STRING(24),
		primaryKey: true,
	},
	notify_channel_id: Sequelize.STRING(24),
	debug: Sequelize.BOOLEAN,
});

async function getCollection(collectionId) {
	try {
		const collectionBody = [];
		collectionBody.push('collectioncount=1&publishedfileids[0]=' + collectionId);

		const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/',
			{ method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				},
				body: collectionBody },
		);
		const json = await response.json();
		return json.response.collectiondetails[0].children;
	}
	catch (error) {
		console.log(error);
	}
}

async function notifyOnline() {
	const allGuilds = await Guilds.findAll();
	for (const guild of allGuilds) {
		const notify_channel = client.channels.cache.get(guild.notify_channel_id);
		notify_channel.send('Workshopt bot is now online!');
	}
}

async function checkAll() {
	const allGuilds = await Guilds.findAll();
	console.log('Checking collections for ' + allGuilds.length + ' servers.');

	for (const guild of allGuilds) {
		const notify_channel = client.channels.cache.get(guild.notify_channel_id);
		const collectionId = guild.collection_id;
		try {
			await checkCollection(collectionId, notify_channel);
		}
		catch (error)	{
			console.log(error);
		}
	}
}

const checkCollection = async (collectionId, notify_channel) => {
	const collectionBody = [];
	collectionBody.push('collectioncount=1&publishedfileids[0]=' + collectionId);
	getCollection(collectionId).then(function(collection) {
		for (const item of collection) {
			const itemBody = [];
			const itemId = item.publishedfileid;
			itemBody.push('itemcount=1&publishedfileids[0]=' + itemId);
			try {
				(async () => {
					const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/',
						{ method: 'POST',
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
							body: itemBody });
					const json = await response.json();

					console.log('Checking: ' + json.response.publishedfiledetails[0].title);
					const itemLastUpdate = new Date(json.response.publishedfiledetails[0].time_updated * 1000);
					const itemURL = 'https://steamcommunity.com/sharedfiles/filedetails/?id=' + itemId;

					const itemEmbed = new MessageEmbed()
						.setColor('#0099ff')
						.setTitle(json.response.publishedfiledetails[0].title)
						.setURL(itemURL)
						.setThumbnail(json.response.publishedfiledetails[0].preview_url)
						.addField('Last Updated', itemLastUpdate.toString(), true);

					const fourDays = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
					const fifteenMinutes = new Date(Date.now() - 15 * 60 * 1000);
					if (itemLastUpdate > fourDays) {
						if(itemEmbed !== null) { notify_channel.send(itemEmbed); }
					}
				})();
			}
			catch (error) {
				console.log(error);
			}
			// 4 requests per second
			setTimeout(() => console.log('Pausing api calls.'), 250);
		}
	});
};

client.on('ready', () => {
	Guilds.sync();
	console.log('Ready!');

	// Check every 15 minutes
	setInterval(function() { checkAll(); }, 15 * 60 * 1000);

	try {
		notifyOnline();
	}
	catch (error) { console.log(error); }
});

client.on('message', async message => {
	const prefix = '!';
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	const guild_id = message.guild.id;
	const channel_id = message.channel.id;

	if (command === 'wsbcheck') {
		const guild = await Guilds.findOne({ where: { guild_id: guild_id } });
		if (guild) {
			console.log('Checking Collection: ' + guild.collection_id);
			const notify_channel = client.channels.cache.get(guild.notify_channel_id);
			checkCollection(guild.collection_id, notify_channel);
		}
		else { message.channel.send('Could not locate a configuration for your server.'); }
	}
	else if (command === 'wsbconfig') {
		try {
			// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
			await Guilds.create({
				guild_id: guild_id,
				collection_id: args[0],
				notify_channel_id: channel_id,
			});
			return message.reply('Workshop Bot Configured Successfully!');
		}
		catch (e) {
			if (e.name === 'SequelizeUniqueConstraintError') {
				return message.reply('That configuration already exists.');
			}
			return message.reply('Something went wrong with adding a configuration.');
		}
		/* 		if (args.length === 2) {
			// is numeric
			if (args[0] === 1) {
				// Database insert here.
			}
			else { NOTIFY_CHANNEL.send('Error: Collection is not numeric id!'); }
		}
		else { NOTIFY_CHANNEL.send('Error: invalid paramters.  Example: !setconfig [collection-id] [channel-id or "here"]'); } */
	}
});

client.login(process.env.DISCORD_TOKEN);
