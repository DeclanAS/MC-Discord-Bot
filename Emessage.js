const Discord = require('discord.js');

export default class Emessage {

	constructor() {
		this.Message = new Discord.MessageEmbed();
	}

	createLyrics(color, title, description, thumbnail, footer) {
		this.Message.setColor(color);
		this.Message.setTitle(title);
		this.Message.setDescription(description);
		if (thumbnail != '')
			this.Message.setThumbnail(thumbnail);
		this.Message.setFooter(footer);
		return this.Message;
	}

	createNotification(color, title, description, footer) {
		this.Message.setColor(color);
		this.Message.setTitle(title);
		this.Message.setDescription(description);
		this.Message.setFooter(footer);
		return this.Message;

	}

}
