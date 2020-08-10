const { Client, MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client();
const prefix = '!';

var collectionId = "2178843757";

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

		//console.log(typeof collection);
	})();	
} 
catch (error)
{
	console.log(error);
}


client.once('ready', () => {
	console.log('Ready!');
});


client.on('message', async message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'checkmods') {
		console.log(collection);

		var totalItems = Object.keys(collection).length;

		for (var i = 0; i < totalItems; i++)
		{
			var itemBody = [];
			var itemId = collection[i].publishedfileid;
			itemBody.push("itemcount=1&publishedfileids[0]=" + itemId);
			//console.log(itemBody);
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
					
					//console.log(json);
					
					var itemTitle = json.response.publishedfiledetails[0].title; 
					var itemLastUpdate = new Date(json.response.publishedfiledetails[0].time_updated * 1000);
					var itemURL = 'https://steamcommunity.com/sharedfiles/filedetails/?id=' + itemId;
					var itemMessage = itemTitle + "\n" + itemLastUpdate.toString();
					
					const exampleEmbed = new MessageEmbed()
					.setColor('#0099ff')
					.setTitle(json.response.publishedfiledetails[0].title)
					.setURL(itemURL)
					//.setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
					//.setDescription('Some description here')
					.setThumbnail(json.response.publishedfiledetails[0].preview_url)
					//.addFields(
					//	{ name: 'Regular field title', value: 'Some value here' },
					//	{ name: '\u200B', value: '\u200B' },
					//	{ name: 'Inline field title', value: 'Some value here', inline: true },
					//	{ name: 'Inline field title', value: 'Some value here', inline: true },
					//)
					.addField('Last Updated', itemLastUpdate.toString(), true)
					//.setImage('https://i.imgur.com/wSTFkRM.png')
					//.setTimestamp(itemLastUpdate)
					//.setFooter('Last Updated', itemLastUpdate.toString());


					if (itemLastUpdate > new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))
					{
						message.channel.send(exampleEmbed);
					}
					
				})();	
			} 
			catch (error)
			{
				console.log(error);
			}	
		}
	}
});

client.login('NzQxMzM5NTcyMjA5NzEzMjIz.Xy2IRw.EgBlxNIk-fsdjs5zcbAkpRSCyXA');