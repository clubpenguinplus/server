import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import Validator from 'fastest-validator'
import Handler from '../Handler'

export default class Login extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            verChk: this.checkVersion,
            login: this.login,
            token_login: this.tokenLogin,
        }

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
            noBeta: {
                success: false,
                message: 43,
            },
            twoFA: {
                success: false,
                message: 49,
            },
        }
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

    async checkVersion(xmlData, user) {
        let userVers = xmlData.getElementsByTagName('ver')[0].getAttribute('v').split('-')
        if (userVers[1] == 'beta') return user.sendXml('OK')
        let verfile = await fetch(`https://clubpenguinplus.nyc3.digitaloceanspaces.com/client/current.version?v=${Date.now().toString()}`)
        let version = await verfile.text()

        if (userVers[0] !== version) {
            return user.sendXml('KO')
        }
        user.sendXml('OK')
    }

    async login(xmlData, user) {
        let username = xmlData.getElementsByTagName('nick')[0].childNodes[0].nodeValue
        let password = xmlData.getElementsByTagName('pword')[0].childNodes[0].nodeValue

        let check = this.check({
            username: username,
            password: password,
        })

        if (check != true) {
            // Invalid data input
            user.sendXt('l', `f%${check[0].message}`)
        } else {
            // Comparing password and checking for user existence
            let response = await this.comparePasswords(username, password, user.socket, user)
            if (response.success) {
                user.sendXt('l', `t%${response.username}%${response.isMod}%${response.key}%${response.populations.join()}`)
            } else {
                user.sendXt('l', `f%${response.message}`)
            }
        }

        user.close()
    }

    async tokenLogin(xmlData, user) {
        let username = xmlData.getElementsByTagName('nick')[0].childNodes[0].nodeValue
        let token = xmlData.getElementsByTagName('token')[0].childNodes[0].nodeValue

        let response = await this.compareTokens(username, token, user.socket, user)
        if (response.success) {
            user.sendXt('l', `t%${response.username}%${response.isMod}%${response.key}%${response.populations.join()}`)
        } else {
            user.sendXt('l', `f%${response.message}`)
        }

        user.close()
    }

    // Functions

    async comparePasswords(username, password, socket, u) {
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

        let isBeta = user.dataValues.rank >= 2
        if (!isBeta) {
            return this.responses.noBeta
        }

        let twoFA = user.dataValues.has2FA == 1
        if (twoFA) {
            let validIP = await this.db.checkAllowedIp(user.dataValues.id, u.address)
            if (!validIP) {
                return await this.generate2FAToken(user, u)
            }
        }

        return await this.onLoginSuccess(socket, user)
    }

    async compareTokens(username, token, socket, u) {
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

        let isBeta = user.dataValues.rank >= 2
        if (!isBeta) {
            return this.responses.noBeta
        }

        let twoFA = user.dataValues.has2FA == 1
        if (twoFA) {
            let validIP = await this.db.checkAllowedIp(user.dataValues.id, u.address)
            if (!validIP) {
                return await this.generate2FAToken(user, u)
            }
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
            isMod: user.dataValues.rank >= 3 ? '1' : '0',
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

    get worlds() {
        let worlds = []
        for (let world of Object.keys(this.crumbs.worlds)) {
            if (this.crumbs.worlds[world].public) {
                worlds.push(world)
            }
        }
        return worlds
    }

    async getWorldPopulations(isModerator) {
        let populations = []

        for (let world of this.worlds) {
            let maxUsers = process.env.maxUsers || 300
            let population = parseInt(await this.handler.api.apiFunction('/getPopulation', {world: world}))

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

    async generate2FAToken(user, u) {
        let code

        let exist = await this.db.twoFA.findOne({
            where: {
                userId: user.dataValues.id,
                ip: u.address,
            },
            attributes: ['code'],
        })
        if (!exist) {
            code = crypto.randomBytes(16).toString('hex')

            this.db.twoFA.create({
                userId: user.dataValues.id,
                code: code,
                ip: u.address,
            })
        } else {
            code = exist.code
        }

        let template = fs.readFileSync('templates/email/2fa/en.html').toString()

        let templateReplacers = [
            ['2FA_LINK', `https://play.cpplus.pw/en/?twofa=${user.dataValues.id}&${code}`],
            ['PENGUIN_NAME', user.dataValues.username],
        ]

        this.handler.email.send(user.dataValues.email, 'Login from new device', template, templateReplacers)

        return this.responses.twoFA
    }
}
