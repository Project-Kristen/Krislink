const crypto = require('crypto');

module.exports = class Crypto {
    constructor() { }

    static sign(privateKey, passphrase, data) {
        /*crypto.createSign('RSA-SHA256').update(data).sign(crypto.createPrivateKey({
            key: privateKey,
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: passphrase
        }), 'base64');*/

        return crypto.sign(null, Buffer.from(data), crypto.createPrivateKey({
            key: privateKey,
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: passphrase
        })).toString('base64');
    }

    static verify(publicKey, signature, data) {
        // return crypto.createVerify('RSA-SHA256').update(data).verify(publicKey, signature, 'base64');

        return crypto.verify(null, Buffer.from(data), crypto.createPublicKey({
            key: publicKey,
            format: 'pem'
        }), Buffer.from(signature, 'base64'));
    }

    static encrypt(publicKey, passphrase, data) {
        //var cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(passphrase, 'hex'), Buffer.alloc(16, 0));
        //let encrypted = cipher.update(data, 'utf8', 'base64');
        //encrypted += cipher.final('base64');
        
        //return crypto.publicEncrypt(publicKey, Buffer.from(encrypted)).toString('base64');
        var key = crypto.randomBytes(32).toString('hex');
        var iv = crypto.randomBytes(16).toString('hex');
        var cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        var keyInRsaEncrypt = crypto.publicEncrypt(publicKey, Buffer.from(key, 'hex')).toString('base64');
        var ivInRsaEncrypt = crypto.publicEncrypt(publicKey, Buffer.from(iv, 'hex')).toString('base64');
        return `${keyInRsaEncrypt}|${ivInRsaEncrypt}|${encrypted}`;
    }

    static decrypt(privateKey, passphrase, data) {
        var pkey = crypto.createPrivateKey({
            key: privateKey,
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: passphrase
        })

        var [key, iv, encData] = data.split('|');

        var _key = crypto.privateDecrypt(pkey, Buffer.from(key, 'base64')).toString('hex');
        var _iv = crypto.privateDecrypt(pkey, Buffer.from(iv, 'base64')).toString('hex');

        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(_key, 'hex'), Buffer.from(_iv, 'hex'));
        let decrypted = decipher.update(encData, 'base64', 'utf8');
        return (decrypted + decipher.final('utf8'));
    }

    static generateKeyPair(type, bits, passphrase) {
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair(type, {
                modulusLength: bits,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                    cipher: 'aes-256-cbc',
                    passphrase
                }
            }, (err, publicKey, privateKey) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ publicKey, privateKey });
                }
            });
        });
    }

    static sha512(data) {
        return crypto.createHash('sha512').update(data).digest('hex');
    }
}