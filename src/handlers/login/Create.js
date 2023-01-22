import bcrypt from 'bcrypt'
import crypto from 'crypto'
const fs = require('fs')

import Handler from '../Handler'

export default class Create extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            check_username: this.checkUsername,
            check_email: this.checkEmail,
            signup: this.signup,
        }
    }

    async validUsername(username) {
        if (username.length < 3) {
            return false
        } else if (username.length > 15) {
            return false
        } else if (!username.match(/^[a-zA-Z0-9 ]+$/)) {
            return false
        }

        let user = await this.db.getUserByUsername(username)
        if (user) {
            return false
        }
        return true
    }

    async validEmail(email) {
        if (!email.includes('@')) {
            return false
        } else if (!email.includes('.')) {
            return false
        } else if (email.length > 50) {
            return false
        } else if (email.includes('+')) {
            return false
        }

        let user = await this.db.getUserByEmail(email)
        if (user) {
            return false
        }

        return true
    }

    async validPassword(password, username) {
        if (password.length < 6) {
            return false
        } else if (password.length > 50) {
            return false
        } else if (password.includes(username)) {
            return false
        }
        return true
    }

    async checkUsername(xmlData, user) {
        let username = xmlData.getElementsByTagName('user')[0].getAttribute('n')

        if (!(await this.validUsername(username))) {
            return user.sendXml('U#KO')
        }
        user.sendXml('U#OK')
    }

    async checkEmail(xmlData, user) {
        let email = xmlData.getElementsByTagName('email')[0].getAttribute('e')

        if (!(await this.validEmail(email))) {
            return user.sendXml('E#KO')
        }
        user.sendXml('E#OK')
    }

    async signup(xmlData, user) {
        let username = xmlData.getElementsByTagName('nick')[0].childNodes[0].nodeValue
        let password = xmlData.getElementsByTagName('pword')[0].childNodes[0].nodeValue
        let email = xmlData.getElementsByTagName('email')[0].childNodes[0].nodeValue
        let over13 = xmlData.getElementsByTagName('over13')[0].childNodes[0].nodeValue
        let color = xmlData.getElementsByTagName('color')[0].childNodes[0].nodeValue
        let lang = xmlData.getElementsByTagName('lang')[0].childNodes[0].nodeValue

        let userValid = await this.validUsername(username)
        if (!userValid) {
            return user.sendXt('U#KO')
        }
        let emailValid = await this.validEmail(email)
        if (!emailValid) {
            return user.sendXt('E#KO')
        }
        let passwordValid = await this.validPassword(password, username)
        if (!passwordValid) {
            return user.sendXt('U#KO')
        }
        let ipValid = await this.db.validIp(user.address)
        if (!ipValid) {
            return user.sendXt('I#KO')
        }

        let activationKey = crypto.randomBytes(16).toString('hex')
        password = await bcrypt.hash(password, parseInt(process.env.cryptoRounds))

        let acc = await this.db.createAccount(username, password, email, over13, color, user.address, activationKey)
        if (!acc) return

        let code = crypto.randomBytes(16).toString('hex')

        await this.db.twoFA.create({
            userId: acc.id,
            ip: user.address,
            code: code,
            isAllowed: 1,
        })

        let template = fs.readFileSync('templates/email/activate/en.html').toString()

        let templateReplacers = [
            ['ACTIVATE_LINK', 'https://play.cpplus.pw/en/?activate='],
            ['ACTIVATE_CODE', activationKey],
            ['PENGUIN_NAME', username],
            ['PENGUIN_EMAIL', email],
        ]

        if (await this.handler.email.send(email, 'Verify your email', template, templateReplacers)) {
            user.sendXml('R#OK')
            this.handler.api.apiFunction('/userCreated', {user: acc.dataValues.id, username: username, ip: user.address, email: email, color: color})
        } else {
            user.sendXml('R#KO')
        }
    }
}
