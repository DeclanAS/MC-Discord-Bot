# MC Discord Bot
 A multifunctional discord bot created using Javascript.

## Dependencies:
- youtube-api-v3-search
- genius-lyrics-api
- discord.js
- ytdl-core

## Commands:
- \[prefix\] **play** \[Youtube Search\]
  - Plays the sound from the first result the Youtube API returns.
- \[prefix\] **play** \[Youtube URL\]
  - Plays the sound from the corresponding Youtube video.
- \[prefix\] **pause**
  - Pauses the sound/song.
- \[prefix\] **resume**
  - Resumes the sound/song.
- \[prefix\] **stop**
  - Stops the current song all together, and deletes the queue elements.
- \[prefix\] **skip**
  - Skips the current song and plays the next song in the queue.
- \[prefix\] **queue**
  - Displays an embedded message containing the current song, and all other songs/Youtube videos in the queue.
- \[prefix\] **remove** \[position\]
  - Removes the song/Youtube video at a certain position in the queue.
- \[prefix\] **lyrics**
  - Grabs the Youtube video name to send to the Genius API as a search query. Hopefully returns the correct lyrics.
