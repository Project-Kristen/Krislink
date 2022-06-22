const path = require('path')

const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const OPCodes = require('../../src/server/ws/OPCodes');

const Queue = require('./queue');
const Track = require('./track');
const EventEmitter = require('events');

class Player extends EventEmitter {
    constructor(client, workerPool) {
        super();

        this.client = client;
        this.workerPool = workerPool;

        this.queue = []; // 隊列
        this.extractor = null;
    }

    join(guildId, voiceChannelId, selfDeaf = true) {
        console.log(guildId, !!getVoiceConnection(guildId))
        if (!getVoiceConnection(guildId)) { // check if already in voice channel
            console.log(this.client.adapters)
            // if not
            return joinVoiceChannel({
                channelId: voiceChannelId,
                guildId,
                selfDeaf,
                adapterCreator: (methods) => {
                    this.client.adapters.set(guildId, methods)

                    return {
                        sendPayload: (data) => {
                            this.client.send(
                                {
                                    type: OPCodes.DJS_VOICE_PAYLOAD,
                                    data
                                }
                            );

                            return true;
                        },
                        destroy: () => {
                            this.client.adapters.delete(guildId);
                        }
                    };
                }
            })
        } else {
            return getVoiceConnection(guildId); // return the voice connection
        }
    }

    disconnect(guildId) {
        return new Promise((resolve, reject) => {
            if (getVoiceConnection(guildId)) {
                this.queue.find(q => q.guildId === guildId).handleEmpty()
                this.queue = this.queue.filter(q => q.guildId !== guildId)
                return resolve(true);
            } else {
                return resolve(false);
            }
        })
    }

    stop(guildId) {
        return new Promise((resolve, reject) => {
            if (getVoiceConnection(guildId)) {
                this.queue.find(q => q.guildId === guildId).handleEmpty()
                this.queue = this.queue.filter(q => q.guildId !== guildId)
                return resolve(true);
            } else {
                return resolve(false);
            }
        })
    }

    pause(guildId) {
        return new Promise((resolve, reject) => {
            var queue = this.queue.find(q => q.guildId === guildId)
            if (queue && !queue.paused) {
                queue.audioPlayer.pause()
                queue.paused = true
                return resolve(true)
            } else {
                return reject(new Error("Queue is not playing or already paused"))
            }
        })
    }

    volume(guildId, volume) {
        return new Promise((resolve, reject) => {
            const queue = this.queue.find(q => q.guildId === guildId);
            if (queue) {
                queue.resource.volume.setVolumeLogarithmic(volume / 100)
                return resolve(true);
            } else {
                return reject(new Error("Queue not found"))
            }
        })
    }

    resume(guildId) {
        return new Promise((resolve, reject) => {
            var queue = this.queue.find(q => q.guildId === guildId)
            if (queue && queue.paused) {
                queue.audioPlayer.unpause()
                queue.paused = false
                return resolve(true)
            } else {
                return reject(new Error("Queue is not playing or paused"))
            }
        })
    }

    search(query, options = {}) {
        return new Promise((resolve, reject) => {
            return this.workerPool.scheduleTask(path.resolve(process.cwd(), "src/workers/search.js"), { data: { query, returnOne: options.returnOne } })
                .then(res => {
                    return resolve(res instanceof Array ? res.map(r => new Track(r)) : new Track(res))
                }).catch(reject)
        })
    }

    play(guildId, voiceChannelId, query, requesterId) {
        return new Promise((resolve, reject) => {
            const voiceConnection = this.join(guildId, voiceChannelId);
            let queue = this.queue.find(queue => queue.guildId === guildId)/* ?? (() => {
                let q = new Queue(guildId, voiceConnection);
                this.queue.push(q);
                return q; // little trick to make it work
            })();*/

            console.log(queue)

            if (!queue) {
                queue = new Queue(guildId, voiceConnection);
                this.queue.push(queue);
            }

            if (queue.playing) {
                this.search(query, { returnOne: true }).then(res => {
                    res.requesterId = requesterId;
                    queue.enqueue(res);
                    return resolve(res)
                })
            } else {
                this.search(query, { returnOne: true }).then(res => {
                    res.requesterId = requesterId;
                    queue.enqueue(res);
                    this._initizeQueue(queue);
                    queue.once("destory", () => this.emit("destroy", queue))
                    return resolve(res)
                })
            }
        })
    }

    seek(guildId, seek) {
        return new Promise((resolve, reject) => {
            const queue = this.queue.find(q => q.guildId === guildId);
            if (queue) {
                queue.additionalStreamTime = seek
                return this.update(queue, { seek }).then(resolve).catch(reject);
            } else {
                return reject(new Error("Queue not found"))
            }
        })
    }

    queueLoop(guildId, forceOverride) {
        return new Promise((resolve, reject) => {
            const queue = this.queue.find(q => q.guildId === guildId);
            if (queue) {
                queue.queueLoop = forceOverride ?? !queue.queueLoop;
                queue.queueCache = [queue.playing, ...queue.tracks]
                return resolve(queue.queueLoop);
            } else {
                return reject(new Error("Queue not found"))
            }
        })
    }

    loop(guildId, forceOverride) {
        return new Promise((resolve, reject) => {
            const queue = this.queue.find(q => q.guildId === guildId);

            if (queue) {
                queue.loop = forceOverride ?? !queue.loop;
                return resolve(queue.loop);
            } else {
                return reject(new Error("Queue not found"))
            }
        })
    }

    // find the queue
    // and check the previous track cache in the queue
    // if there is a previous track
    // then destroy the dispatcher
    // and play the previous track
    previous(guildId) {
        return new Promise((resolve, reject) => {
            const queue = this.queue.find(q => q.guildId === guildId);
            if (queue && queue.previousCache[0]) {
                queue.unshift(queue.previousCache.shift());
                return queue.handleNext(true).then(resolve).catch(reject);
            } else {
                return reject(new Error("No previous track or queue is not playing"))
            }
        })
    }

    next(guildId) {
        return new Promise((resolve, reject) => {
            const queue = this.queue.find(q => q.guildId === guildId);
            if (queue && !queue?.loop) {
                if (queue && queue.tracks[0]) {
                    queue.unshift(queue.tracks.shift());
                    return queue.handleNext(true).then(resolve).catch(reject);
                } else {
                    return reject(new Error("No next track or queue is not playing"))
                }
            } else {
                return queue.handleNext(true).then(resolve).catch(reject);
            }
        })
    }

    update(queue, data) {
        return new Promise((resolve, reject) => {
            queue.updating = true
            queue.handleNext(true, data).then(resolve).catch(reject);
        })
    }

    _initizeQueue(queue) {
        queue.handleNext().then(() => { })
        queue.once('destroy', () => {
            this.queue = this.queue.filter(q => q.guildId !== queue.guildId)
        })
    }
}

module.exports = Player;