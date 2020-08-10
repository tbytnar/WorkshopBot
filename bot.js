const { Client, MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const debug = true;

const client = new Client();
const prefix = '!';

var NOTIFY_CHANNEL;
client.on('ready', () => {
	NOTIFY_CHANNEL = client.channels.cache.get('688880181410398227'); // Channel to send notification
	console.log('Ready!');
});

var collectionId = "2178843757";
var token = process.env.DISCORD_TOKEN;

var collectionBody = [];
collectionBody.push("collectioncount=1&publishedfileids[0]=" + collectionId)

var collection;

try {
	(async () => {
		const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/', 
										{ method: 'POST',
										  headers: {
											'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
										  },
										  body: collectionBody }
									); 
		const json = await response.json();
		
		collection = json.response.collectiondetails[0].children;
	})();	
} 
catch (error)
{
	console.log(error);
}

function checkCollection(collectionId)
{
	var totalItems = Object.keys(collection).length;
	var totalItemsUpdated = 0;

	for (var i = 0; i < totalItems; i++)
	{
		var itemBody = [];
		var itemId = collection[i].publishedfileid;
		itemBody.push("itemcount=1&publishedfileids[0]=" + itemId);

		try {
			(async () => {
				const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', 
												{ method: 'POST',
												headers: {
													'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
												},
												body: itemBody }
											); 
				const json = await response.json();

				var itemLastUpdate = new Date(json.response.publishedfiledetails[0].time_updated * 1000);
				var itemURL = 'https://steamcommunity.com/sharedfiles/filedetails/?id=' + itemId;
				
				const itemEmbed = new MessageEmbed()
				.setColor('#0099ff')
				.setTitle(json.response.publishedfiledetails[0].title)
				.setURL(itemURL)
				.setThumbnail(json.response.publishedfiledetails[0].preview_url)
				.addField('Last Updated', itemLastUpdate.toString(), true)

				if (itemLastUpdate > new Date(Date.now() - 15 * 60 * 1000))
				{
					totalItemsUpdated ++;
					message.channel.send(itemEmbed);
				}
			})();	
		} 
		catch (error)
		{
			console.log(error);
		}	
	}

	if(totalItemsUpdated == 0 && debug) { NOTIFY_CHANNEL.send('No mods have been updated recently!'); }
}

setInterval(function() { checkCollection(collectionId); }, 15 * 60 * 1000); // Check every 15 minutes

client.on('message', async message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'checkmods') {
		checkCollection(collectionId);
	}
});

client.login(token);
