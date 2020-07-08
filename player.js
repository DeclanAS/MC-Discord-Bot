
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

	// TODO: Make sure "playing" variable is properly implemented, OR remove it all together.
*/

export default class Player {

	constructor(){
		this.dispatcher;
		this.connection;
		this.queue = [];
		this.playing = false;
		this.title = ''; // For adding official title for displaying the queue.
		this.options = {
			q: '',
			maxResults: 3,
			type: 'video'
		};
	}

	async musicOptions(command, message, args) {
		// Play command scenarios.
		// 	- URL 			--> args[0] = URL.
		// 	- Song Title 	--> args[0:] = Song Title.
		if(command == "play"){

			if(message.member.voice.channel){
				this.connection = await message.member.voice.channel.join();
			} else {
				message.channel.send("User is not inside of a voice channel.");
				return;
			}

			if(this.queue.length == 0) {
				if (this.validURL(args[0])) {
					this.queue.push(args[0]); // Adds Song/url.
					this.playLink(this.queue[0], this.connection, message);
				} else {
					var query = args.join(' ');
					this.queue.push(query);
					this.search(message);
				}

			} else if (this.queue.length >= 1) {
				if(this.validURL(args[0])){
					this.queue.push(args[0]);
				} else {
					var query = args.join(' ');
					this.queue.push(query);
				}
				message.react('👍');
			}

		} else if (command == "queue") {
			this.showQueue(message);
		} else if (command == "stop") {
			this.stop();
		} else if (command == "pause"){
			this.pause();
		} else if (command == "resume") {
			this.resume();
		} else if (command == "skip") {
			this.skip(message);
		} else if (command == "remove") {
			this.remove(args[0], message);
		}
	}

	async playLink(url, connection, message){
		this.dispatcher = connection.play(ytdl(url, { filter: 'audioonly'} ));

		this.dispatcher.on('start', () => { this.playing = true });

		this.dispatcher.on('finish', () => { 
			this.queue.shift();
			if(this.queue.length != 0){
				if(this.validURL(this.queue[0]))
					this.playLink(this.queue[0], this.connection, message);
				else
					this.search(message);
			} else {
				this.playing = false;
			}
		});
	}

	stop(){
		this.dispatcher.destroy();
		this.playing = false;
		this.queue = [];
	}

	pause(){
		this.dispatcher.pause();
		this.playing = false;
	}

	resume() {
		this.dispatcher.resume();
		this.playing = true;
	}


	skip(message) {
		if(this.queue.length < 2){
			message.channel.send("Cannot skip song (no other songs in queue).");
		} else {
			this.dispatcher.destroy();
			this.queue.shift();
			if(this.validURL(this.queue[0]))
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
			if((position + 1) == this.queue.length) { // Remove the last element.
				message.channel.send("Successfully removed " + this.queue[this.queue.length - 1] + " from the queue1.");
				this.queue.pop();
			} else { // Remove the element in between first index to last index.
				message.channel.send("Successfully removed " + this.queue[position] + " from the queue2.");
				this.queue.slice((position - 1), (position + 1));
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
		for(var i = 0; i < this.queue.length; i++)
			console.log("\tElement " + (i + 1) + ": " + this.queue[i]);
		console.log("--------------------");

		const queueEmbed = new Discord.MessageEmbed()
			.setColor('#FF4500')
			.setTitle('Music Player Queue (Will be updated)');

		if(this.queue.length > 0) {
			var songList = "Currently Playing: " + this.queue[0] + "\n";
			for(var count in this.queue)
				if(count != 0)
					songList = songList.concat((count) + " --> " + this.queue[count] + "\n");

			queueEmbed.setDescription(songList);
		} else {
			queueEmbed.setDescription('No songs in queue.');
		}

		message.channel.send(queueEmbed);
		
	}


	validURL(str) { // Useful method to check if a url is valid.
		var pattern = new RegExp('^(https?:\\/\\/)?'+ // Protocol.
		'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // Domain name.
		'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address.
		'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // Port and path.
		'(\\?[;&a-z\\d%_.~+=-]*)?'+ // Query string.
		'(\\#[-a-z\\d_]*)?$','i'); // Fragment locator.
		return !!pattern.test(str);
	}

}
