const Application = require('./src/application')
const art = require('ascii-art')

art.font("Krislink", 'Doom', (res) => {
    console.log(res);
    new Application(require('./config.json'))
});