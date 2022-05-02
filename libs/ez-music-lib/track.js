const { createAudioResource, demuxProbe } = require('@discordjs/voice')
//const ytdl = require('ytdl-core')
const play = require('play-dl')

const { parseTimeToMS, msToHHMMSS } = require("./util");

const { spawn } = require('child_process');

function FFmpegOpus(stream, seekTime = 0, filterArg = []) {
  var seek = seekTime ? ["-ss", seekTime] : []
  let encoderArgs = [
    "-i",
    "-",
    ...seek,
    "-reconnect",
    "1",
    "-reconnect_at_eof",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_delay_max",
    "5",
    "-analyzeduration",
    "0",
    "-loglevel",
    "0",
    "-acodec",
    "libopus",
    "-f",
    "opus",
    "-ar",
    "48000",
    "-ac",
    "2",
    ...filterArg,
    "-"
  ];

  //const ffmpeg = new prism.FFmpeg({ shell: false, args: encoderArgs });
  //ffmpeg.on('error', console.error)
  //ffmpeg.once('close', ffmpeg.destroy)

  const ffmpeg = spawn(require('ffmpeg-static'), encoderArgs, {
    stdio: ['pipe', 'pipe', 'ignore'],
    shell: false
  })

  /*ffmpeg.on('exit', () => {
    ffmpeg.stdin.destroy()
    ffmpeg.stdout.destroy()
  })*/

  stream.pipe(ffmpeg.stdin)

  ffmpeg.stdout.on("error", () => {
    if (!ffmpeg.killed) ffmpeg.kill();
    ffmpeg.stdout.resume();
  });

  return ffmpeg.stdout
}

function FFmpegSeek(stream, seekTime) {
  let encoderArgs = [
    "-ss",
    seekTime,
    "-i",
    "-",
    "-reconnect",
    "1",
    "-reconnect_at_eof",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_delay_max",
    "5",
    "-analyzeduration",
    "0",
    "-loglevel",
    "0",
    "-acodec",
    "libopus",
    "-f",
    "opus",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-"
  ];

  const ffmpeg = spawn(require('ffmpeg-static'), encoderArgs, {
    stdio: ['pipe', 'pipe', 'ignore']
  })

  ffmpeg.on('exit', () => {
    ffmpeg.stdout.resume();
  })

  ffmpeg.stdout.on("error", () => {
    if (!ffmpeg.killed) ffmpeg.kill();
    ffmpeg.stdout.resume();
  });

  stream.pipe(ffmpeg.stdin)

  return ffmpeg.stdout
}

class Track {
  constructor(data) {
    this.title = data.title;
    this.url = data.url; // url to the track, not for download
    // this.fileExtractUrl = data.fileExtractUrl; // used for downloading the file
    this.author = data.author;
    this.duration = data.duration; // in formatted HH:mm:ss or mm:ss
    this.durationInMS = parseTimeToMS(this.duration);
    this.thumbnail = data.thumbnail;

    this.requesterId = null;
  }

  extract(properties) {
    return new Promise((resolve, reject) => {
      play.stream(this.url).then(info => {
        var ffmpeg = properties?.seek ? FFmpegSeek(info.stream, msToHHMMSS(properties?.seek)) : info.stream

        //demuxProbe(ffmpeg).then(info => {
        resolve(
          createAudioResource(ffmpeg, {
            inputType: info.type,
            inlineVolume: true // Allows for volume control, but It might cause memory leaks, so do cleanup after usage
          })
        )
        //}).catch(reject)
      }).catch(reject)
    })
  }

  toJSON() {
    return {
      title: this.title,
      url: this.url,
      author: this.author,
      duration: this.duration, // in formatted HH:mm:ss or mm:ss
      durationInMS: this.durationInMS,
      thumbnail: this.thumbnail,
      requesterId: this.requesterId
    }
  }

  static fromJSON(data) {
    return new Track(data)
  }
}

module.exports = Track;