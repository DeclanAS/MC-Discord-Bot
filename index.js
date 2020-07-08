const Discord = require('discord.js');
const bot = new Discord.Client();
const ytdl = require('ytdl-core');

const token = 'DISCORD BOT\'S UNIQUE TOKEN';
const prefix = "habibi";

import Player from './player.js';

const Musicplayer = new Player();

// On bot ready-state
bot.on('ready', () => {  console.log("Habibi is ready");  });


bot.on('message', message => {

	// Return if the message does not start with the prefix, or if a bot sent the message.
	if(!message.content.startsWith(prefix) || message.author.bot) return;

	// Parse other arguments.
	let args = message.content.slice(prefix.length + 1).split(' ');
	args.shift();

	// Parse the command from text.
	const command = message.content.split(' ')[1];

	switch(command) {
		case 'join':
			join(message);
			break;

		case 'leave':
			leave(message);
			break;

		case 'help':
			message.channel.send("No help for you!");
			break;
		case 'play':
		case 'stop':
		case 'skip':
		case 'pause':
		case 'remove':
		case 'resume':
		case 'queue':
			Musicplayer.musicOptions(command, message, args);
			break;

	}

});


async function join(message){
	if(message.member.voice.channel){
		const connection = await message.member.voice.channel.join();
	}
}

async function leave(message){
	if(message.member.voice.channel){
		const connection = await message.member.voice.channel.leave();
	}
}


bot.login(token);
	