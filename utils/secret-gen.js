// Generates a new JWT secret and stores it in config.json
// Servers must be restarted for the new key to take effect

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const file = path.resolve(__dirname, '../.env')


try {
    let secret = crypto.randomBytes(32).toString('hex')
    fs.readFile(file, 'utf-8', (err, contents) => {
        if (err) {
            return console.error(err)
        }

        const replaced = contents.replace(/CRYPTO_SECRET/gi, `"${secret}"`);

        fs.writeFile(file, replaced, 'utf-8', function (err) {
            return console.error(err);
        });
     });
    console.log('Secret updated')

} catch (err) {
    console.error(err)
}
