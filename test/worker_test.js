const { parentPort } = require('worker_threads');
parentPort.postMessage('Hello from the worker!');