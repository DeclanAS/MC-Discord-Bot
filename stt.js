import * as config from './config.js'

const util = require('util');
const { Readable } = require('stream');
const witClient = require('node-witai-speech');

var mode = 0;
var MP = null;
var ON = false;
let lastCall = null;
const guildMap = new Map();

export async function stopListening(message) {
	ON = false;
	await message.member.voice.channel.leave();
}

export async function listen(bot, message, musicplayer, args) {

	if (ON == true) {
		message.reply('Speech to text is already running.');
		return;
	}

	if (args[0] == 'all')
		mode = 1;
	else if (args[0] == 'music')
		mode = 2;

	try {
		MP = musicplayer;
		ON = true;
		let VChannel = await bot.channels.fetch(message.member.voice.channelID);
		if (!VChannel) return message.reply('Errors!');
		let TChannel = await bot.channels.fetch(message.channel.id);
		if (!TChannel) return message.reply('Errors!');
		let VConn = await message.member.voice.channel.join();
		let mapKey = message.guild.id;
		guildMap.set(mapKey, {
			'text_Channel': TChannel,
			'voice_Channel': VChannel,
			'voice_Connection': VConn,
			'debug': false,
		});

		processVoice(mapKey, message, VConn);

		VConn.on('disconnect', async (error) => {
			if (error) console.log(error);
			guildMap.delete(mapKey);
		});

	} catch (exception) {
		console.log('In listen():\n' + exception);
	}
}

function processVoice(mapKey, message, VConn) {
	VConn.on('speaking', async (user, speaking) => {
		if (speaking.bitfield == 0 || user.bot)
			return;
		// console.log(`I am listening to: ${user.username}`);
		const audioStream = VConn.receiver.createStream(user, { mode: 'pcm' });

		audioStream.on('error', (error) => {
			console.log('Audio Stream error:' + error);
		});

		let buffer = [];
		audioStream.on('data', (data) => {
			buffer.push(data);
		});

		audioStream.on('end', async () => {
			buffer = Buffer.concat(buffer);
			const duration = buffer.length / 48000 / 4;
			console.log(`${user.username} was recorded for: ` + duration + ` second(s).`);

			if (duration < 1 || duration > 15)
				return;

			try {

				let new_buffer = await convert(buffer);
				let output = await toText(new_buffer);

				if (output != null) {
					if (output && output.length) {
						let id = guildMap.get(mapKey);
						validateText(output, message, id, user);
					}
				}

			} catch (exception) {
				console.log('Conversion/Transcribe error: ' + exception);
			}
		});
	});
}


async function convert(buffer) {
	try {
		const data = new Int16Array(buffer);
		const ndata = new Int16Array(data.length / 2);
		for (let i = 0, j = 0; i < data.length; i += 4) {
			ndata[j++] = data[i];
			ndata[j++] = data[i + 1];
		}
		return Buffer.from(ndata);
	} catch (exception) {
		console.log('Conversion error:' + exception);
	}

}

async function toText(new_buffer) {
	try {
		if (lastCall != null) {
			let now = Math.floor(new Date());
			while (now - lastCall < 1000) {
				// sleep(100);
				now = Math.floor(new Date());
			}
		}
	} catch (exception) {
		console.log('837: ' + exception);
	}

	try {
		const extractSpeechIntent = util.promisify(witClient.extractSpeechIntent);
		var stream = Readable.from(new_buffer);
		const contenttype = "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little";
		const output = await extractSpeechIntent(config.WitAi, stream, contenttype);
		lastCall = Math.floor(new Date());
		stream.destroy();

		if (output && '_text' in output && output._text.length)
			return output._text

		if (output && 'text' in output && output.text.length)
			return output.text

		return output;

	} catch (exception) {
		console.log('851:' + exception);
	}
}

function validateText(text, message, id, user) {
	var sbstr = text.split(' ');
	var args = '';

	if (mode == 1)
		id.text_Channel.send('```' + user.username + ' said: ' + text + '```');

	if (sbstr[0] == 'habibi' || sbstr[0] == 'michael') {
		if ((sbstr[1] == 'play' && sbstr.length >= 3) || (sbstr[1] == 'remove' && sbstr.length >= 3) || (sbstr[1] == 'lyrics' && sbstr.length >= 2)) {
			for (var it = 2; it < sbstr.length; it++)
				args = args + sbstr[it] + ' ';
			args = args.trim();
			if (mode == 2)
				id.text_Channel.send('```' + user.username + ' said: ' + text + '```');

		} else if (sbstr[1] == 'skip' || sbstr[1] == 'pause' || sbstr[1] == 'stop' || sbstr[1] == 'resume' || sbstr[1] == 'lyrics' || sbstr[1] == 'list') {
			if (sbstr[1] == 'list')
				sbstr[1] = 'queue';
			if (mode == 2)
				id.text_Channel.send('```' + user.username + ' said: ' + text + '```');
		}

		MP.musicOptions(sbstr[1], message, args.split(' '));
	}
}