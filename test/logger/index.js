const { getLogger } = require("../../libs/fox-logger/logger");

const logger = getLogger('test');
logger.log('verbose', '114514 1919 810');
logger.log('info', 'YYYY MM DD HH mm ss');
logger.log('ws', new Promise((resolve) => resolve('114514')));
logger.log('fatal', '%s %d %n %m');
logger.log('silly', BigInt(2**31 - 1));
logger.log('error', new Date());
logger.log('debug', Buffer.from([0x1f, 0x1e, 0x33]))
logger.log('http', 'HTTP/1.1 200 OK')

logger.log('error', new Error('RTX_LW is yang wei.'));