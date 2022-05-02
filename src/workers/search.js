const { parentPort, isMainThread } = require('worker_threads');
const ytsr = require('youtube-sr').default;

if (isMainThread) throw new Error('This file should be run in a worker thread.');

parentPort.once('message', (message) => {
    if (!message.returnOne) {
        ytsr.search(message.query).then(results => {
            console.log(results)
            parentPort.postMessage(results.map(r => {
                return {
                    title: r.title,
                    url: r.url,
                    thumbnail: r.thumbnail.url,
                    duration: r.durationFormatted,
                    author: r.channel.name
                }
            }));
        });
    } else {
        ytsr.searchOne(message.query).then(result => {
            parentPort.postMessage({
                title: result.title,
                url: result.url,
                thumbnail: result.thumbnail.url,
                duration: result.durationFormatted,
                author: result.channel.name
            })
        });
    }
})