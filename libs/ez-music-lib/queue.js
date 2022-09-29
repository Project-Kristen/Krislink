const { AudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const EventEmitter = require('events');

class Queue extends EventEmitter {
    constructor(guildId, voiceConnection) {
        super();

        this.guildId = guildId;
        this.voiceConnection = voiceConnection;

        this.audioPlayer = new AudioPlayer({
            debug: true,
            behaviors: {
                maxMissedFrames: 30,
                noSubscriber: NoSubscriberBehavior.Stop
            }
        }); // Notice: Memory leak will occur if you don't remove all listeners.

        this.playing = null;
        this.resource = null;

        this.paused = false;

        this.tracks = [];

        this.previousCache = [];
        this.queueCache = [];

        this._isQueueSafe = true;

        this.loop = false;
        this.queueLoop = false;

        this.updating = false;

        this.additionalStreamTime = 0;

        voiceConnection.subscribe(this.audioPlayer);

        this.audioPlayer.on('debug', this.emit.bind(this, 'debug'));
        this.audioPlayer.on('stateChange', (state1, state2) => this._handleState(state1, state2));
    }

    enqueue(item) {
        this.tracks.push(item);
    }

    unshift(item) {
        this.tracks.unshift(item);
    }

    // this must be called on queue end,
    // otherwise memory leaks will occur,
    // and do not call it on minor thread.
    cleanUp() {
        this.emit('debug', '[Queue] Cleaning up.');
        this.tracks = null;
        delete this.tracks

        this.audioPlayer.removeAllListeners();
        this.audioPlayer.stop();
        this.audioPlayer = null;
        delete this.audioPlayer;

        this.voiceConnection?.destroy();
        this.voiceConnection = null;
        delete this.voiceConnection;

        this.resource.playStream.destroy();
        this.resource.playStream.read();
        this.resource.volume.destroy();
        this.resource.volume.read();
        this.resource = null;
        delete this.resource;

        this.emit('destroy')
        this.removeAllListeners();
    }

    // this will be called on queue start or songs changes
    // to update the queue.
    handleNext(isUpdate = false, updateProperties = {}) {
        return new Promise((resolve, reject) => {
            this.emit('debug', isUpdate, updateProperties, this.tracks.length)
            if (isUpdate) { // is update can bypass the queue lock limit at this time
                this._isQueueSafe = false;
                this.updating = true;
                // do not delete track, since it's update
                this.resource.playStream.destroy();
                this.resource.playStream.read();
                this.resource.volume.destroy();
                this.resource.volume.read();
                this.playing.extract(updateProperties).then(stream => {
                    this.audioPlayer.play(stream);
                    this.resource = stream;
                    this._isQueueSafe = true;
                    this.updating = false;
                    entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 5e3).then(resolve).catch(reject);
                })
                this.updating = false;
            } else if (this._isQueueSafe && this.tracks.length) { // We locks the queue to prevent multiple calls.
                this._isQueueSafe = false;
                this.playing ? this.previousCache.push(this.playing) : undefined;
                var track = this.playing = this.tracks.shift();
                track.extract().then(stream => {
                    this.audioPlayer.play(stream);
                    this.resource = stream;
                    this._isQueueSafe = true;
                    entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 5e3).then(resolve).catch(reject);
                })
            } else if (this._isQueueSafe && this.loop) {
                this.playing.extract().then(stream => {
                    this.audioPlayer.play(stream);
                    this.resource = stream;
                    this._isQueueSafe = true;
                    entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 5e3).then(resolve).catch(reject);
                })
            } else if (this._isQueueSafe && this.queueLoop) {
                var cache = Array.from(this.queueCache);
                this.tracks = cache;
                track.extract().then(stream => {
                    this.audioPlayer.play(stream);
                    this.resource = stream;
                    this._isQueueSafe = true;
                    entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 5e3).then(resolve).catch(reject);
                })
            } else if (!this._isQueueSafe) {
                reject(new Error('Queue is busy.'));
            } else {
                this.handleEmpty();
                resolve();
            }
        })
    }

    handleEmpty() {
        this.emit('end')
        this.cleanUp();
    }

    _handleState(state1, state2) {
        // console.log("[Queue] State change triggered", state1.status, 'to', state2.status);
        if (state1.status !== AudioPlayerStatus.Idle && state2.status === AudioPlayerStatus.Idle && !this.updating) {
            this.handleNext().then(() => {
                this.emit('debug', '[Queue] Next track.');
                this.playing ? this.emit('next', this.playing) : this.emit('end');
            });
        }
    }
}

module.exports = Queue;