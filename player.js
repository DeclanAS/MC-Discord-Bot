import { getSong, searchSong } from 'genius-lyrics-api'
import searchYoutube from 'youtube-api-v3-search'
import * as config from './config.js'
import Emessage from './Emessage.js'

const Discord = require('discord.js');
const ytdl = require('ytdl-core');

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

	constructor() { // Constructor
		this.dispatcher; // What plays sounds.
		this.connection; // Connection link to the voice channel.
		this.queue = []; // Array that acts like a queue.
		this.title = []; // For adding official title for displaying the queue.
		this.options = { // Youtube query options.
			q: '',
			maxResults: 1,
			type: 'video'
		};
	}

	async musicOptions(command, message, args) {

		// Switch for different commands passed in.
		switch (command) {
			case 'play': // Play command

				if (message.member.voice.channel) { // Checks if user is in the voice channel.
					this.connection = await message.member.voice.channel.join();
				} else {
					message.channel.send("User is not inside of a voice channel.");
					return;
				}

				if (this.queue.length == 0) { // Play options if the queue is empty:
					if (ytdl.validateURL(args[0])) { // If the link is a proper Youtube video URL.
						let valid = await this.setOptions(query, 1, message)
						if (valid) {
							this.queue.push(args[0]); // Adds url to queue.
							this.playLink(this.queue[0], this.connection, message); // Plays song
						}

					} else { // If the song request is a Youtube search.
						var query = args.join(' '); // Puts the query into a single string.
						let valid = await this.setOptions(query, 1, message)
						if (valid) {
							this.queue.push(query); // Adds song query to the queue.
							this.search(message); // Searches Youtube and plays the resulting song.
						}
					}

				} else if (this.queue.length >= 1) { // Same as above, except if the query is not empty.
					if (ytdl.validateURL(args[0])) { // If the user passed a valid Youtube video url as a song request.
						let valid = await this.setOptions(query, 1, message)
						if (valid)
							this.queue.push(args[0]);

					} else { // If the user passed a Youtube search query as a song request.
						var query = args.join(' ');
						let valid = await this.setOptions(query, 1, message)
						if (valid)
							this.queue.push(query);
					}
					message.react('👍'); // Reacts with a thumbs up instead of messaging in the channel.
				}

				break;
			case 'queue': // Shows song(s) in the queue.
				this.showQueue(message);
				break;
			case 'stop': // Stops the song and removes the queue.
				this.stop();
				break;
			case 'pause': // Pauses the current song.
				this.pause();
				break;
			case 'resume': // Resumes the current song.
				this.resume();
				break;
			case 'skip': // Ends the current song and starts the next.
				this.skip(message);
				break;
			case 'remove': // Removes a certain song in the queue.
				this.remove(args[0], message);
				break;
			case 'lyrics':
				this.lyrics(args, message);
				break;
		}

	}

	async playLink(url, connection, message) { // Async function for playing a song given a url.

		// Uses ytdl-core to play the song url.
		// - Filtered for audio only, and with a high buffering size.
		this.dispatcher = connection.play(ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 }));

		// Dispatcher events:
		// Start:
		// - Sends a notification to the channel notifying that the song started.
		// Finish:
		// - Dequeue (shifts) the queue for both queue and title queue.
		// - Checks if there is another song in the queue, and plays it depending on if it is a URL or YT search request.
		// Error:
		// - Most errors are caused by age-restricted videos being requested.
		// - Age-restricted videos return 410 typically.
		// - Displays to console. (Usually picks up TCP disconnect errors).

		this.dispatcher.on('start', () => {
			message.channel.send("Now playing: " + url.toString());
		});


		this.dispatcher.on('finish', () => {
			this.queue.shift();
			this.title.shift();

			if (this.queue.length != 0)
				if (ytdl.validateURL(this.queue[0]))
					this.playLink(this.queue[0], this.connection, message);
				else
					this.search(message);
		});


		this.dispatcher.on('error', error => {
			let errorMessage = new Emessage()
			message.channel.send(errorMessage.createNotification('#D6C911', 'Failed To Play Song', 'This is likely due to an age-restricted video request.', 'MC bot'))

			console.log(error)
			
			this.queue.shift()
			this.title.shift()

			if (this.queue.length != 0)
				if (ytdl.validateURL(this.queue[0]))
					this.playLink(this.queue[0], this.connection, message);
				else
					this.search(message);

		});
	}

	stop() { // Destroys the "song player", and empties the queues.
		this.dispatcher.destroy();
		this.queue = [];
		this.title = [];
	}

	pause() { // Pauses dispatcher.
		this.dispatcher.pause();
	}

	resume() { // Resumes dispatcher.
		this.dispatcher.resume();
	}

	skip(message) { // Ends current song, plays the next in the queue (if any).

		if (this.queue.length < 2) {
			message.channel.send("Cannot skip song (no other songs in queue).");
		} else {
			this.dispatcher.destroy();
			this.queue.shift();
			this.title.shift();
			if (ytdl.validateURL(this.queue[0]))
				this.playLink(this.queue[0], this.connection, message);
			else
				this.search(message);
		}
	}

	remove(position, message) { // Removes a certain song in the queue given user input.

		if (this.queue.length < 2) { // If the queue is too small.
			message.channel.send("The queue is not large enough to remove a song.");

		} else if (position > (this.queue.length - 1)) { // If the user enters too high of a position.
			message.channel.send("Invalid position.");

		} else { // If there is a valid position inputted.

			if ((parseInt(position) + 1) == this.queue.length) { // Remove the last element.
				message.channel.send("Successfully removed " + this.title[this.queue.length - 1] + " from the queue.");
				this.queue.pop();
				this.title.pop();
			} else { // Remove the element in between first index to last index.
				// Works by deleting the position, then shifting all elements after to the left, and popping the last
				// element off, since it is a duplicate.
				message.channel.send("Successfully removed " + this.title[position] + " from the queue.");
				delete this.queue[position];
				delete this.title[position];
				for (var count = parseInt(position) + 1; this.title[count] != undefined; count++) {
					this.queue[count - 1] = this.queue[count];
					this.title[count - 1] = this.title[count];
				}
				this.queue.pop();
				this.title.pop();
			}
		}
	}

	async search(message) { // Search function to gather the Youtube title & video ID

		this.options.q = this.queue[0]; // Sets "q" (query) to current queue element.
		let result = await searchYoutube(config.Youtube, this.options)
		if (result.pageInfo.totalResults > 0) {
			var item = result.items[0]
			var URL = 'https://www.youtube.com/watch?v=';
			this.playLink(URL.concat(item.id.videoId), this.connection, message);
			console.log("Youtube Search Results For \"" + this.options.q + "\" --> " + item.snippet.title + " [" + item.id.videoId + "]");
		} else {
			return
		}

	}

	showQueue(message) { // Displays the queue to both the user and log.

		this.decodeTitle(); // Cleans up title of HTML encoding.
		for (var i = 0; i < this.title.length; i++)
			console.log("\tElement " + (i + 1) + ": " + this.title[i]);

		// Sets up an embedding to display the queue contents.
		const queueEmbed = new Discord.MessageEmbed()
			.setColor('#FF4500')
			.setTitle('Music Player Queue (Will be updated)');

		if (this.title.length > 0) {
			var songList = "Currently Playing: " + this.title[0] + "\n";
			for (var count in this.title)
				if (count != 0)
					songList = songList.concat((count) + " --> " + this.title[count] + "\n");

			queueEmbed.setDescription(songList);
		} else {
			queueEmbed.setDescription('No songs in queue.');
		}

		message.channel.send(queueEmbed);

	}

	async setOptions(query, type, message) { // Adds the title of YouTube video to the "queue".
		if (type == 0)
			this.options.q = ytdl.getURLVideoID(query);
		else if (type == 1)
			this.options.q = query;

		let result = await this.getTitle(message)

		return result
	}

	async getTitle(message) {
		let result = await searchYoutube(config.Youtube, this.options)

		if (result.pageInfo.totalResults == 0) {
			console.log('No Results')
			message.channel.send(new Emessage().createNotification('#F0F0F0', 'No Results Found', 'Your search turned up no results.', 'MC bot'))
			return false

		} else {
			this.title.push(result.items[0].snippet.title); // There may be an issue here where snippet is undefined.
			return true
		}
	}

	decodeTitle() { // Decodes HTML encoding.

		for (var count = 0; this.title[count] != undefined; count++) {
			var decode = this.title[count].toString();
			decode = decode.split('&quot;').join('\"');
			decode = decode.split('&apos;').join('\'');
			decode = decode.split('&#39;').join('\'');
			decode = decode.split('&amp;').join('&');
			decode = decode.split('&lt;').join('<');
			decode = decode.split('&gt;').join('>');
			decode = decode.split('&iexcl;').join('¡');
			decode = decode.split('&iquest;').join('¿');
			this.title[count] = decode;
		}
	}

	async lyrics(args, message) {
		// genius-api-lyrics has been edited to NOT return null if lyrics length > 4000.

		/* Scenarios:
			A. lyrics < 2048 char 						 => Print out full lyrics in one MessageEmbed.
			B. lyrics >= 2048 char && lyrics < 3000 char => Print out full lyrics in two MessageEmbeds.
			C. lyrics >= 3000 char && lyrics < 3500 char => Print out full lyrics in three MessageEmbeds.
			D. lyrics >= 3500 char && lyrics < 4000 char => Print out full lyrics in four MessageEmbeds.
		*/

		// Instantiate variables.
		var lyrics_1 = '', lyrics_2 = '', lyrics_3 = '', lyrics_4 = '';
		var embed_1 = new Emessage(), embed_2 = new Emessage(), embed_3 = new Emessage(), embed_4 = new Emessage();
		var options = { // Lyrics query options.
			apiKey: config.Genius,
			title: this.queue[0],
			artist: this.queue[0],
			optimizeQuery: true
		};

		// Used to get lyrics & album image.
		var song = await getSong(options);
		// Used to get the full title of the song.
		var searchResult = await searchSong(options);

		// Error checking.
		((song == null || searchResult == null) ? message.channel.send("Lyrics Error (Lyrics > 4k char OR no results returned).") : console.log("Lyrics search succesful."));

		var lyrics = song.lyrics;

		console.log(lyrics.length);

		// Formatting the lyrics into embeds with respect to lyrics length & sending.
		if (lyrics == null) {
			message.channel.send(embed_1.createLyrics('#FFFFFF', 'Error', 'Could not find lyrics.', '', 'MC bot - Using Genius Api'));
		} else if (lyrics.length < 2048) {
			message.channel.send(embed_1.createLyrics('#FFFF00', searchResult[0].title, lyrics, song.albumArt, 'MC bot - Using Genius Api'));
		} else if (lyrics.length >= 2048 && lyrics.length < 3000) {
			lyrics_1 = lyrics.slice(0, lyrics.length / 2);
			lyrics_1 = lyrics_1.slice(0, lyrics_1.lastIndexOf('\n'));
			lyrics_2 = lyrics.slice(lyrics_1.length, lyrics.length);
			message.channel.send(embed_1.createLyrics('#FFFF00', searchResult[0].title, lyrics_1, song.albumArt, 'MC bot - Using Genius Api'));
			message.channel.send(embed_2.createLyrics('#FFFF00', 'Lyrics Continued...', lyrics_2, '', 'MC bot - Using Genius Api'));
		} else if (lyrics.length >= 3000 && lyrics.length < 3500) {
			lyrics_1 = lyrics.slice(0, lyrics.length / 3);
			lyrics_1 = lyrics_1.slice(0, lyrics_1.lastIndexOf('\n'));
			lyrics_2 = lyrics.slice(lyrics_1.length, (lyrics.length / 3) * 2);
			lyrics_2 = lyrics_2.slice(0, lyrics_2.lastIndexOf('\n'));
			lyrics_3 = lyrics.slice(lyrics_2.length, lyrics.length);
			message.channel.send(embed_1.createLyrics('#FFFF00', searchResult[0].title, lyrics_1, song.albumArt, 'MC bot - Using Genius Api'));
			message.channel.send(embed_2.createLyrics('#FFFF00', 'Lyrics Continued...', lyrics_2, '', 'MC bot - Using Genius Api'));
			message.channel.send(embed_3.createLyrics('#FFFF00', 'Lyrics Continued...', lyrics_3, '', 'MC bot - Using Genius Api'));
		} else if (lyrics.length >= 3500 && lyrics.length < 4000) {
			lyrics_1 = lyrics.slice(0, lyrics.length / 4);
			lyrics_1 = lyrics_1.slice(0, lyrics_1.lastIndexOf('\n'));
			lyrics_2 = lyrics.slice(lyrics_1.length, lyrics.length / 2);
			lyrics_2 = lyrics_2.slice(0, lyrics_2.lastIndexOf('\n'));
			lyrics_3 = lyrics.slice(lyrics_2.length, (lyrics.length / 4) * 3);
			lyrics_3 = lyrics_3.slice(0, lyrics_3.lastIndexOf('\n'));
			lyrics_4 = lyrics.slice(lyrics_3.length, lyrics.length);
			message.channel.send(embed_1.createLyrics('#FFFF00', searchResult[0].title, lyrics_1, song.albumArt, 'MC bot - Using Genius Api'));
			message.channel.send(embed_2.createLyrics('#FFFF00', 'Lyrics Continued...', lyrics_2, '', 'MC bot - Using Genius Api'));
			message.channel.send(embed_3.createLyrics('#FFFF00', 'Lyrics Continued...', lyrics_3, '', 'MC bot - Using Genius Api'));
			message.channel.send(embed_4.createLyrics('#FFFF00', 'Lyrics Continued...', lyrics_4, '', 'MC bot - Using Genius Api'));
		} else if (lyrics.length > 4000) {
			message.channel.send(embed_1.createLyrics('#FFFFFF', 'Error', 'Lyrics Exceed 4000 Characters.', song.albumArt, 'MC bot - Using Genius Api'));
		}
	}
}
