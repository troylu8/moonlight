const {createCipheriv, createDecipheriv, randomBytes} = require('crypto');
const fs = require('fs');
const { readFileOrDefault } = require('./util.js');

let secretKey;
readFileOrDefault(__dirname + "/client.key", randomBytes(32), "hex")
    .then(data => {
        secretKey = data instanceof Buffer? data : Buffer.from(data, "hex");
        console.log("client secret key:", secretKey, secretKey.byteLength);
    })

function encrypt(text) {
    const iv = randomBytes(16);
    
    const cipher = createCipheriv("aes256", secretKey, iv);

    return  iv.toString("hex") + ":" + 
            cipher.update(text, "utf8", "hex") +
            cipher.final("hex")
}

function decrypt(text) {
    [ iv, ciphertext ] = text.split(":");

    const decipher = createDecipheriv("aes256", secretKey, Buffer.from(iv, "hex"));

    return decipher.update(ciphertext, "hex", "utf8") + decipher.final("utf8");
}

module.exports = {encrypt, decrypt}