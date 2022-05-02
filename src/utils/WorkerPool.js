const os = require('os');

const {
    Worker: NODEJS_Worker
} = require('worker_threads');

class Worker {
    constructor(id) {
        this.id = id;
        this._status = 'idle';
    }

    run(fn, data) {
        return new Promise((resolve, reject) => {
            this.status = 'running';
            var worker = new NODEJS_Worker(fn);
            if (data) worker.postMessage(data);
            worker.once('message', (message) => {
                this.status = 'idle';
                worker.terminate();
                return resolve(message);
            });
            worker.on('error', reject);
        })
    }

    get status() {
        return this._status;
    }

    set status(status) {
        this._status = status;
    }
}

module.exports = class WorkerPool {
    constructor(count=os.cpus().length*2) {
        this._workers = Array(count).fill(null).map(() => new Worker(count--)).reverse();
    }

    scheduleTask(fn, options={}) {
        return new Promise((resolve, reject) => {
            const worker = this.getAvailableWorker();
            if (!worker) {
                reject(new Error('No idle worker available'));
            }
            worker.run(fn, options.data).then(resolve).catch(reject);
        });
    }

    getAvailableWorker() {
        return this._workers.find(worker => worker.status === 'idle');
    }
}