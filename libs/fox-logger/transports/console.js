const os = require('node:os');
const util = require('node:util');

const Transport = require('./transport');

class ConsoleTransport extends Transport {
    constructor(options = {}) {
        super();

        this.name = options.name ?? 'default';
        this.template = options.template ?? '[YYYY/MM/DD HH:mm:ss.SSS] [%s/%s] %s%s';
        this.formatter = options.formatter ?? null;
    }

    setFormatter(formater) {
        this.formatter = formater;
    }

    log(level, ...message) {
        process.stdout.write(
            util.format(
                this.formatter.formatDate(this.template, new Date()), 
                this.name, 
                this.formatter.formatLevel(level),
                message.map(argument => typeof argument === 'string' ? argument : util.inspect(argument, { colors: true })).join(' '),
                os.EOL
            )
        );
    }
}

module.exports = ConsoleTransport;