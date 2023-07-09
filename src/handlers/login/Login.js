import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import Validator from 'fastest-validator'
import Handler from '../Handler'
const fs = require('fs')

export default class Login extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            verChk: this.checkVersion,
            login: this.login,
            token_login: this.tokenLogin
        }

        this.check = this.createValidator()

        this.responses = {
            notFound: {
                success: false,
                message: 28
            },
            wrongPassword: {
                success: false,
                message: 29
            },
            permaBan: {
                success: false,
                message: 30
            },
            notActive: {
                success: false,
                message: 31
            },
            noBeta: {
                success: false,
                message: 43
            },
            twoFA: {
                success: false,
                message: 49
            }
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
                    stringMax: 35
                }
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
                    stringMax: 37
                }
            }
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
        let saveToken = xmlData.getElementsByTagName('saveToken')[0].childNodes[0].nodeValue == 'true'

        let check = this.check({
            username: username,
            password: password
        })

        if (check != true) {
            // Invalid data input
            user.sendXt('l', `f%${check[0].message}`)
        } else {
            // Comparing password and checking for user existence
            let response = await this.comparePasswords(username, password, user.socket, user)
            function getShortString() {
                const values = [response.dataValues.id, response.dataValues.username, response.dataValues.color, response.dataValues.head, response.dataValues.face, response.dataValues.neck, response.dataValues.body, response.dataValues.hand, response.dataValues.feet, response.dataValues.flag, response.dataValues.photo]
                return values.join('|')
            }
            if (response.success) {
                user.sendXt('l', `t%${response.username}%${response.isMod}%${response.key}%${response.populations.join()}%${getShortString()}`)
                // Create new token
                if (saveToken) {
                    let token = await this.genAuthToken(response.dataValues)
                    this.db.authTokens.create({
                        userId: response.dataValues.id,
                        selector: token.split(':')[0],
                        validator: token.split(':')[1]
                    })
                    user.sendXt('at', `${response.dataValues.username.toLowerCase()}%${token}`)
                }
            } else {
                user.sendXt('l', `f%${response.message}`)
            }
        }

        user.close()
    }

    async tokenLogin(xmlData, user) {
        let username = xmlData.getElementsByTagName('nick')[0].childNodes[0].nodeValue
        let token = xmlData.getElementsByTagName('token')[0].childNodes[0].nodeValue
        let saveToken = xmlData.getElementsByTagName('saveToken')[0].childNodes[0].nodeValue == 'true'

        let response = await this.compareTokens(username, token, user.socket, user)
        function getShortString() {
            const values = [response.dataValues.id, response.dataValues.username, response.dataValues.color, response.dataValues.head, response.dataValues.face, response.dataValues.neck, response.dataValues.body, response.dataValues.hand, response.dataValues.feet, response.dataValues.flag, response.dataValues.photo]
            return values.join('|')
        }
        if (response.success) {
            user.sendXt('l', `t%${response.username}%${response.isMod}%${response.key}%${response.populations.join()}%${getShortString()}`)
            // Create new token
            if (saveToken) {
                let token = await this.genAuthToken(response.dataValues)
                this.db.authTokens.create({
                    userId: response.dataValues.id,
                    selector: token.split(':')[0],
                    validator: token.split(':')[1]
                })
                user.sendXt('at', `${response.dataValues.username.toLowerCase()}%${token}`)
            }
        } else {
            user.sendXt('l', `f%${response.message}`)
        }

        user.close()
    }

    async genAuthToken(userData) {
        let validator = crypto.randomBytes(16).toString('hex')
        function generateSelector(userData) {
            let userId = userData.id.toString()
            let array = userId.split('')
            array = array.map((num) => String.fromCharCode(parseInt(num) + 65))
            array.reverse()
            let now = Date.now().toString()
            return array.join('') + now
        }
        let selector = generateSelector(userData)

        return `${selector}:${validator}`
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

        const id = user.dataValues.id

        let split = token.split(':')

        let selector = split[0]
        let validator = split[1]

        let authToken = await this.db.getAuthToken(id, selector)
        if (!authToken || authToken.dataValues.validator != validator) {
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
            let validIP = await this.db.checkAllowedIp(id, u.address)
            if (!validIP) {
                return await this.generate2FAToken(user, u)
            }
        }

        // Delete token if successful
        this.db.authTokens.destroy({
            where: {
                userId: id,
                selector: selector
            }
        })

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
            message: [38, hours]
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
            dataValues: user.dataValues
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
                hash: hash
            },
            process.env.cryptoSecret,
            {expiresIn: parseInt(process.env.loginKeyExpiry)}
        )
    }

    get worlds() {
        let worlds = []
        for (let world of Object.keys(this.crumbs.worlds[process.env.environment || 'production'])) {
            if (this.crumbs.worlds[process.env.environment || 'production'][world].public) {
                worlds.push(world)
            }
        }
        return worlds
    }

    async getWorldPopulations(isModerator) {
        let populations = []

        for (let world of this.worlds) {
            let popData = JSON.parse(
                await (
                    await fetch(this.crumbs.worlds[process.env.environment || 'production'][world].address + '/getpopulation', {
                        method: 'POST'
                    })
                ).text()
            )
            let population = parseInt(popData.population)
            let maxUsers = parseInt(popData.maxUsers)

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
                ip: u.address
            },
            attributes: ['code']
        })
        if (!exist) {
            code = crypto.randomBytes(16).toString('hex')

            this.db.twoFA.create({
                userId: user.dataValues.id,
                code: code,
                ip: u.address
            })
        } else {
            code = exist.code
        }

        let template = fs.readFileSync('templates/email/2fa/en.html').toString()

        let templateReplacers = [
            ['2FA_LINK', `https://play.cpplus.pw/en/?twofa=${user.dataValues.id}&${code}`],
            ['PENGUIN_NAME', user.dataValues.username],
            ['PENGUIN_EMAIL', user.dataValues.email]
        ]

        this.handler.email.send(user.dataValues.email, 'Login from new device', template, templateReplacers)

        return this.responses.twoFA
    }
}
