
import searchYoutube from 'youtube-api-v3-search';
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const YTkey = 'YOUTUBE SEARCH API KEY';

/*	Music Player Queue Options:
	- Play (No song in queue)
	- Play (Song(s) in queue)
	- Pause (Does not matter if song(s) are in queue).
	- Stop (Does not matter if song(s) are in queue).
	- Resume( Does not matter if song(s) are in queue).
	- Skip (Must have a song in the queue after CURRENT song).
	- Remove Element in queue.
	- Show Queue (Shows queue).
	/ ---------------------------------------------------------/
	Queue Layout:
	Empty: [ ] --> No song playing.
	One Song: [ Song-Title/URL ] --> Current song playing.
	Two Songs: [ Song-Title/URL, Song-Title/URL ] --> Current song playing + another.

*/

export default class Player {

	constructor(){
		this.dispatcher;
		this.connection;
		this.queue = [];
		this.title = []; // For adding official title for displaying the queue.
		this.options = {
			q: '',
			maxResults: 3,
			type: 'video'
		};
	}

	async musicOptions(command, message, args) {

		switch(command) {
			case 'play':

				if(message.member.voice.channel){
					this.connection = await message.member.voice.channel.join();
				} else {
					message.channel.send("User is not inside of a voice channel.");
					return;
				}

				if(this.queue.length == 0) {
					if (ytdl.validateURL(args[0])) {
						this.queue.push(args[0]); // Adds Song/url.
						this.addTitle(args[0]); // Adds title to the queue.
						this.playLink(this.queue[0], this.connection, message);
					} else {
						var query = args.join(' ');
						this.queue.push(query);
						this.addTitle(query);
						this.search(message);
					}

				} else if (this.queue.length >= 1) {
					if(ytdl.validateURL(args[0])){
						this.queue.push(args[0]);
						this.addTitle(args[0]);
					} else {
						var query = args.join(' ');
						this.queue.push(query);
						this.addTitle(query);
					}
					message.react('👍');
				}

				break;
			case 'queue':
				this.showQueue(message);
				break;
			case 'stop':
				this.stop();
				break;
			case 'pause':
				this.pause();
				break;
			case 'resume':
				this.resume();
				break;
			case 'skip':
				this.skip(message);
				break;
			case 'remove':
				this.remove(args[0], message);
				break;
		}

	}

	async playLink(url, connection, message){
		this.dispatcher = connection.play(ytdl(url, { filter: 'audioonly', highWaterMark: 1<<25 } ));

		this.dispatcher.on('finish', () => { 
			this.queue.shift();
			this.title.shift();

			if(this.queue.length != 0)
				if(ytdl.validateURL(this.queue[0]))
					this.playLink(this.queue[0], this.connection, message);
				else
					this.search(message);
		});

		this.dispatcher.on('error', error => { console.log(error) });
	}

	stop(){
		this.dispatcher.destroy();
		this.queue = [];
		this.title = [];
	}

	pause(){
		this.dispatcher.pause();
	}

	resume() {
		this.dispatcher.resume();
	}


	skip(message) {
		if(this.queue.length < 2){
			message.channel.send("Cannot skip song (no other songs in queue).");
		} else {
			this.dispatcher.destroy();
			this.queue.shift();
			this.title.shift();
			if(ytdl.validateURL(this.queue[0]))
				this.playLink(this.queue[0], this.connection, message);
			else
				this.search(message);
		}
	}

	remove(position, message) {
		if(this.queue.length < 2){
			message.channel.send("The queue is not large enough to remove a song.");
		} else if (position > (this.queue.length - 1)) {
			message.channel.send("Invalid position.");
		} else {
			if((parseInt(position) + 1) == this.queue.length) { // Remove the last element.
				message.channel.send("Successfully removed " + this.queue[this.queue.length - 1] + " from the queue.");
				this.queue.pop();
				this.title.pop();
			} else { // Remove the element in between first index to last index.
				message.channel.send("Successfully removed " + this.queue[position] + " from the queue.");
				delete this.queue[position];
				delete this.title[position];
				for(var count = parseInt(position) + 1; this.queue[count] != undefined; count++){
					this.queue[count - 1] = this.queue[count];
					this.title[count - 1] = this.title[count];
				}
				this.queue.pop();
				this.title.pop();
			}
		} 
	}

	async search(message){
		this.options.q = this.queue[0];
		let result = await searchYoutube(YTkey, this.options);
		for(var count in result.items) {
			var item = result.items[count];

			if(count == 0){
				var URL = 'https://www.youtube.com/watch?v=';
				message.channel.send("Now playing: " + URL.concat(item.id.videoId));
				this.playLink(URL.concat(item.id.videoId), this.connection, message);
			}

			console.log("Youtube Search Results For \"" + this.options.q + "\" --> " + item.snippet.title + " [" + item.id.videoId + "]");
		}
		console.log(" ");
	}

	showQueue(message) {
		this.decodeTitle();
		for(var i = 0; i < this.title.length; i++)
			console.log("\tElement " + (i + 1) + ": " + this.title[i]);
		console.log("--------------------");

		const queueEmbed = new Discord.MessageEmbed()
			.setColor('#FF4500')
			.setTitle('Music Player Queue (Will be updated)');

		if(this.title.length > 0) {
			var songList = "Currently Playing: " + this.title[0] + "\n";
			for(var count in this.title)
				if(count != 0)
					songList = songList.concat((count) + " --> " + this.title[count] + "\n");

			queueEmbed.setDescription(songList);
		} else {
			queueEmbed.setDescription('No songs in queue.');
		}

		message.channel.send(queueEmbed);
		
	}

	async addTitle(query) { // Adds the title of YouTube video to the "queue".
		if(ytdl.validateURL(query))
			this.options.q = ytdl.getURLVideoID(query);	
		else
			this.options.q = query;
		
		let result = await searchYoutube(YTkey, this.options);
		this.title.push(result.items[0].snippet.title);
	}

	decodeTitle(){
		for(var count = 0; this.title[count] != undefined; count++){
			var decode = this.title[count].toString();
			decode = decode.split('&quot;').join('\"');
			decode = decode.split('&apos;').join('\'');
			decode = decode.split('&amp;').join('&');
			decode = decode.split('&lt;').join('<');
			decode = decode.split('&gt;').join('>');
			decode = decode.split('&iexcl;').join('¡');
			decode = decode.split('&iquest;').join('¿');
			this.title[count] = decode;
		}
	}

}
