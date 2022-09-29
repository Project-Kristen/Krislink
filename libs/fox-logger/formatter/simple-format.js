const chalk = require('chalk');

const levels = {
    'fatal': chalk.red('FATAL'),
    'error': chalk.redBright('ERROR'),
    'info': chalk.cyan('INFO'),
    'http': chalk.greenBright('HTTP'),
    'verbose': chalk.grey('VERBOSE'),
    'debug': chalk.grey('DEBUG'),
    'silly': chalk.grey('SILLY'),
    'default': level => chalk.yellow(level.toUpperCase())
};

class SimpleFormatter {
    formatDate(template, date) {
        return template
                .replace('YYYY', String(date.getFullYear()).padStart(4, '0'))
                .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
                .replace('DD', String(date.getDate()).padStart(2, '0'))
                .replace('HH', String(date.getHours()).padStart(2, '0'))
                .replace('mm', String(date.getMinutes()).padStart(2, '0'))
                .replace('ss', String(date.getSeconds()).padStart(2, '0'))
                .replace('SSS', String(date.getMilliseconds()).padStart(3, '0'));
    }

    formatLevel(level) {
        return levels[level.toLowerCase()] ? levels[level.toLowerCase()] : levels.default(level);
    }
}

module.exports = SimpleFormatter;