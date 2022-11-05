import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import Validator from 'fastest-validator'
import fetch from 'node-fetch'
import Api from '../integration/Api'
const fs = require('fs')
const jsdom = require('jsdom')
const sgMail = require('@sendgrid/mail')

/**
 * Dedicated login server handler that validates user credentials.
 */
export default class LoginHandler {
    constructor(id, users, db, log) {
        this.id = id
        this.users = users
        this.db = db
        this.log = log

        this.api = new Api(this)

        this.check = this.createValidator()

        this.responses = {
            notFound: {
                success: false,
                message: 28,
            },
            wrongPassword: {
                success: false,
                message: 29,
            },
            permaBan: {
                success: false,
                message: 30,
            },
            notActive: {
                success: false,
                message: 31,
            },
        }

        this.log.info(`[LoginHandler] Created LoginHandler for server: ${this.id}`)

        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    }

    createValidator() {
        let validator = new Validator()

        let schema = {
            username: {
                empty: false,
                trim: true,
                type: 'string',
                min: 3,
                max: 12,
                messages: {
                    stringEmpty: 32,
                    stringMin: 34,
                    stringMax: 35,
                },
            },
            password: {
                empty: false,
                trim: true,
                type: 'string',
                min: 3,
                max: 128,
                messages: {
                    stringEmpty: 33,
                    stringMin: 36,
                    stringMax: 37,
                },
            },
        }

        return validator.compile(schema)
    }

    handle(message, user) {
        let xml = new jsdom.JSDOM(message)
        xml = xml.window.document
        try {
            switch (xml.getElementsByTagName('body')[0].getAttribute('action')) {
                case 'verChk':
                    this.checkVersion(xml.getElementsByTagName('ver')[0].getAttribute('v'), user)
                    break
                case 'login':
                    this.login(xml.getElementsByTagName('nick')[0].childNodes[0].nodeValue, xml.getElementsByTagName('pword')[0].childNodes[0].nodeValue, user)
                    break
                case 'token_login':
                    this.tokenLogin(xml.getElementsByTagName('nick')[0].childNodes[0].nodeValue, xml.getElementsByTagName('token')[0].childNodes[0].nodeValue, user)
                    break
                case 'check_username':
                    this.checkUsername(xml.getElementsByTagName('user')[0].getAttribute('n'), user)
                    break
                case 'check_email':
                    this.checkEmail(xml.getElementsByTagName('email')[0].getAttribute('e'), user)
                    break
                case 'signup':
                    this.register(xml.getElementsByTagName('nick')[0].childNodes[0].nodeValue, xml.getElementsByTagName('pword')[0].childNodes[0].nodeValue, xml.getElementsByTagName('email')[0].childNodes[0].nodeValue, xml.getElementsByTagName('over13')[0].childNodes[0].nodeValue, xml.getElementsByTagName('color')[0].childNodes[0].nodeValue, xml.getElementsByTagName('lang')[0].childNodes[0].nodeValue, user)
                    break
                case 'activate':
                    this.activate(xml.getElementsByTagName('email')[0].childNodes[0].nodeValue, xml.getElementsByTagName('key')[0].childNodes[0].nodeValue, user)
            }
        } catch (error) {
            this.log.error(`[LoginHandler] Error: ${error}`)
        }
    }

    // Events

    async checkVersion(userVers, user) {
        if (process.env.disableVerCheck) return user.sendXml('OK')
        let verfile = await fetch(`https://clubpenguinplus.nyc3.digitaloceanspaces.com/client/current.version?v=${Date.now().toString()}`)
        let version = await verfile.text()

        if (userVers !== version) {
            return user.sendXml('KO')
        }
        user.sendXml('OK')
    }

    async login(username, password, user) {
        let check = this.check({
            username: username,
            password: password,
        })

        if (check != true) {
            // Invalid data input
            user.sendXt('l', `f%${check[0].message}`)
        } else {
            // Comparing password and checking for user existence
            let response = await this.comparePasswords(username, password, user.socket)
            if (response.success) {
                user.sendXt('l', `t%${response.username}%${response.isMod}%${response.key}%${response.populations.join()}`)
            } else {
                user.sendXt('l', `f%${response.message}`)
            }
        }

        user.close()
    }

    async tokenLogin(username, token, user) {
        let response = await this.compareTokens(username, token, user.socket)
        if (response.success) {
            user.sendXt('l', `t%${response.username}%${response.isMod}%${response.key}%${response.populations.join()}`)
        } else {
            user.sendXt('l', `f%${response.message}`)
        }

        user.close()
    }

    // Functions

    async comparePasswords(username, password, socket) {
        let user = await this.db.getUserByUsername(username)
        if (!user) {
            return this.responses.notFound
        }

        let match = await bcrypt.compare(password, user.password)
        if (!match) {
            return this.responses.wrongPassword
        }

        let banned = await this.checkBanned(user)
        if (banned) {
            return banned
        }

        let active = this.checkActive(user)
        if (!active) {
            return this.responses.notActive
        }

        let isMod = user.dataValues.rank > 3
        if (!isMod) {
            return this.responses.notFound
        }

        return await this.onLoginSuccess(socket, user)
    }

    async compareTokens(username, token, socket) {
        let user = await this.db.getUserByUsername(username)
        if (!user) {
            return this.responses.notFound
        }

        let split = token.split(':')

        let match = split[1] == user.password
        if (!match) {
            return this.responses.wrongPassword
        }

        let banned = await this.checkBanned(user)
        if (banned) {
            return banned
        }

        let active = this.checkActive(user)
        if (!active) {
            return this.responses.notActive
        }

        return await this.onLoginSuccess(socket, user)
    }

    async checkBanned(user) {
        if (user.permaBan) {
            return this.responses.permaBan
        }

        let activeBan = await this.db.getActiveBan(user.id)
        if (!activeBan) {
            return
        }

        let hours = Math.round((activeBan.expires - Date.now()) / 60 / 60 / 1000)
        return {
            success: false,
            message: [38, hours],
        }
    }

    checkActive(user) {
        if (user.emailActivated) {
            return true
        }
        return false
    }

    async onLoginSuccess(socket, user) {
        // Generate random key, used by client for authentication
        let randomKey = crypto.randomBytes(32).toString('hex')
        // Generate new login key, used to validate user on game server
        user.loginKey = await this.genLoginKey(socket, user, randomKey)

        let populations = await this.getWorldPopulations(user.rank > 3)

        // All validation passed
        await user.save()
        return {
            success: true,
            username: user.username,
            key: randomKey,
            populations: populations,
            isMod: user.dataValues.rank > 3 ? '1' : '0',
        }
    }

    async genLoginKey(socket, user, randomKey) {
        let address = socket.handshake.address
        let userAgent = socket.request.headers['user-agent']

        // Create hash of login key and user data
        let hash = await bcrypt.hash(`${user.username}${randomKey}${address}${userAgent}`, parseInt(process.env.cryptoRounds))

        // JWT to be stored on database
        return jwt.sign(
            {
                hash: hash,
            },
            process.env.cryptoSecret,
            {expiresIn: parseInt(process.env.loginKeyExpiry)}
        )
    }

    async getWorldPopulations(isModerator) {
        let populations = []

        for (let world of ['Blizzard']) {
            let maxUsers = process.env.maxUsers || 300
            let population = parseInt(await this.api.apiFunction('/getPopulation', {world: world}))

            if (population >= maxUsers) {
                populations.push(`${world}:${isModerator ? 5 : 6}`)
                continue
            }

            let barSize = Math.round(maxUsers / 5)
            let bars = Math.max(Math.ceil(population / barSize), 1) || 1

            populations.push(`${world}:${bars}`)
        }

        return populations
    }

    close(user) {
        delete this.users[user.socket.id]
    }

    // Account creation

    async checkUsername(username, user) {
        this.db.getUserByUsername(username).then((u) => {
            if (u) {
                user.sendXml('U#KO')
            } else {
                user.sendXml('U#OK')
            }
        })
    }

    async checkEmail(email, user) {
        this.db.getUserByEmail(email).then((u) => {
            if (u) {
                user.sendXml('E#KO')
            } else {
                user.sendXml('E#OK')
            }
        })
    }

    async register(username, password, email, over13, color, lang, user) {
        let userTaken = await this.db.getUserByUsername(username)
        if (userTaken) {
            return user.sendXt('U#KO')
        }
        let emailTaken = await this.db.getUserByEmail(email)
        if (emailTaken) {
            return user.sendXt('E#KO')
        }

        let activationKey = crypto.randomBytes(16).toString('hex')

        password = await bcrypt.hash(password, parseInt(process.env.cryptoRounds))

        let acc = await this.db.createAccount(username, password, email, over13, color, user.address, activationKey)
        if (!acc) return

        let template = fs.readFileSync('templates/email/activate/en.html').toString()

        let templateReplacers = [
            ['ACTIVATE_LINK', 'https://play.cpplus.pw/en/?activate='],
            ['ACTIVATE_CODE', activationKey],
            ['PENGUIN_NAME', username],
            ['PENGUIN_EMAIL', email],
        ]

        for (let replacer of templateReplacers) {
            template = template.replaceAll(replacer[0], replacer[1])
        }

        const msg = {
            to: email,
            from: {
                email: 'no-reply@clubpenguin.plus',
                name: 'Club Penguin Plus',
            },
            subject: 'Verify your email',
            html: template,
        }
        sgMail
            .send(msg)
            .then(() => {
                user.sendXml('R#OK')
                this.api.apiFunction('/userCreated', {user: acc.dataValues.id, username: username, ip: user.address, email: email, color: color})
            })
            .catch((error) => {
                console.error(error)
            })
    }

    // Account activation

    async activate(email, activationKey, user) {
        let acc = await this.db.getUserByEmail(email)
        if (!acc) {
            return user.sendXml('A#KO')
        }

        if (acc.emailActivated) {
            return user.sendXml('A#OK')
        }

        if (acc.activationKey != activationKey) {
            return user.sendXml('A#KO')
        }

        this.db.users.update({emailActivated: true}, {where: {id: acc.id}}).then(() => {
            user.sendXml('A#OK')
        })
    }
}
