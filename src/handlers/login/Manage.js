import Handler from '../Handler'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
const fs = require('fs')

export default class Manage extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.resetKeys = {}
        this.events = {
            requestReset: this.requestReset,
            reset: this.resetPassword,
        }
    }

    async requestReset(xmlData, user) {
        let u = xmlData.getElementsByTagName('user')[0].childNodes[0].nodeValue
        let account = (await this.db.getUserByUsername(u)) || (await this.db.getUserByEmail(u))

        if (!account) {
            return
        }

        let resetKey = crypto.randomBytes(16).toString('hex')
        this.resetKeys[resetKey] = account.dataValues.id

        let template = fs.readFileSync('templates/email/reset/en.html').toString()

        let templateReplacers = [
            ['PENGUIN_NAME', account.dataValues.username],
            ['RESET_LINK', `https://play.cpplus.pw/en/?reset=${resetKey}`],
        ]

        await this.handler.email.send(account.dataValues.email, 'Reset your password', template, templateReplacers)
    }

    async resetPassword(xmlData, user) {
        let key = xmlData.getElementsByTagName('key')[0].childNodes[0].nodeValue
        let password = xmlData.getElementsByTagName('newPassword')[0].childNodes[0].nodeValue

        if (!this.resetKeys[key]) {
            return user.sendXml('PR#KO')
        }

        let account = await this.db.getUserById(this.resetKeys[key])

        if (!account) {
            return user.sendXml('PR#KO')
        }

        password = await bcrypt.hash(password, parseInt(process.env.cryptoRounds))

        await this.db.users.update({password: password}, {where: {id: account.dataValues.id}})

        delete this.resetKeys[key]

        user.sendXml('PR#OK')
    }
}
