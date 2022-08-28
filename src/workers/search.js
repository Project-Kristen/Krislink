const { parentPort, isMainThread } = require('worker_threads');
const ytsr = require('youtube-sr').default;
const play = require('play-dl');
const util = require('../../libs/ez-music-lib/util');

if (isMainThread) throw new Error('This file should be run in a worker thread.');

parentPort.once('message', async (message) => {
    if (!message.options.returnOne) {
        if (message.options.source === "soundcloud") {
            const clientID = await play.getFreeClientID();
            await play.setToken({ soundcloud: { client_id: clientID } });
            play.search(message.query, { source: { soundcloud: 'tracks' } }).then(results => {
                parentPort.postMessage(results.map(r => {
                    return {
                            title: r.name,
                            url: r.url,
                            thumbnail: r.thumbnail,
                            duration: util.msToHHMMSS(r.durationInMs),
                            author: r.publisher?.artist ?? r.user.full_name,
                            source: 'soundcloud'
                    }
                }));
            });
        } else {
            ytsr.search(message.query).then(results => {
                parentPort.postMessage(results.map(r => {
                    return {
                        title: r.title,
                        url: r.url,
                        thumbnail: r.thumbnail.url,
                        duration: r.durationFormatted,
                        author: r.channel.name,
                        source: 'youtube'
                    }
                }));
            });
        }
    } else {
        const clientID = await play.getFreeClientID();
        await play.setToken({ soundcloud: { client_id: clientID } });

        if (message.options.source === "soundcloud") {
            play.search(message.query, { source: { soundcloud: 'tracks' }, limit: 1 }).then(results => {
                parentPort.postMessage({
                    title: results[0].name,
                    url: results[0].url,
                    thumbnail: results[0].thumbnail,
                    duration: util.msToHHMMSS(results[0].durationInMs),
                    author: results[0].publisher.artist,
                    source: 'soundcloud'
                })
            });
        } else if ((await play.so_validate(message.query)) === "track") {
            play.soundcloud(message.query).then(track => {
                parentPort.postMessage({
                    title: track.name,
                    url: track.url,
                    thumbnail: track.thumbnail,
                    duration: util.msToHHMMSS(track.durationInMs),
                    author: track.publisher.artist,
                    source: 'soundcloud'
                })
            });
        } else {
            ytsr.searchOne(message.query).then(result => {
                parentPort.postMessage({
                    title: result.title,
                    url: result.url,
                    thumbnail: result.thumbnail.url,
                    duration: result.durationFormatted,
                    author: result.channel.name,
                    source: 'youtube'
                })
            });
        }
    }
})