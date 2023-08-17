import RateLimiterFlexible from 'rate-limiter-flexible'
import AES from 'crypto-js/aes'
import enc from 'crypto-js/enc-utf8'

import express from 'express'
import HTTPHandler from '../handlers/HTTPHandler'
import http from 'http'

import User from '../objects/user/User'
import Jira from '../integration/Jira'

export default class Server {
    constructor(id, users, db, handler, iteration) {
        this.users = users
        this.db = db
        this.handler = handler
        this.jira = new Jira(this)

        this.app = express()
        http.createServer(this.app)

        this.httpServer = this.app.listen(parseInt(process.env.startingPort) + iteration, () => {
            if (process.env.debugPackets == 'true') this.handler.log.info(`[Server] Started world ${id} on port ${parseInt(process.env.startingPort) + iteration}`)
        })

        this.httpHandler = new HTTPHandler(this.app, this.handler, this.jira)

        let io = this.createIo({
            cors: {
                origin: process.env.corsOrigin || '*',
                methods: ['GET', 'POST']
            },
            path: '/socket/'
        })

        this.rateLimiter = new RateLimiterFlexible.RateLimiterMemory({
            // 20 events allowed per second
            points: 20,
            duration: 1
        })

        io.on('connection', this.connectionMade.bind(this))
    }

    createIo(options) {
        return require('socket.io')(this.httpServer, options)
    }

    caesarCipherEncryptHex(text, key) {
        let result = ''
        for (let i = 0; i < text.length; i++) {
            let char = text[i]
            if (char.match(/[0-9a-f]/i)) {
                let code = parseInt(char, 16)
                code = (code + key) % 16
                char = code.toString(16)
            }
            result += char
        }
        return result
    }

    generatePrimaryKey(caeserOffset) {
        const now = new Date()

        const hours = now.getUTCHours()
        const date = now.getUTCDate()
        const day = now.getUTCDay()

        const keyNum = hours * date * day
        const keyHex = keyNum.toString(16)

        const key = this.caesarCipherEncryptHex(keyHex, caeserOffset)

        return key
    }

    generatePrimaryServerKey() {
        const key = this.generatePrimaryKey(3) + this.generatePrimaryKey(7) + '9yXruyv2L7PQzmAWHYQmcmNS'
        return key
    }

    generatePrimaryClientKey() {
        const key = this.generatePrimaryKey(5) + this.generatePrimaryKey(11) + 'KSd7zZ9bCKgxBvPcPJXUBgHV'
        return key
    }

    connectionMade(socket) {
        let user = new User(socket, this.handler, this.generatePrimaryServerKey(), this.generatePrimaryClientKey())

        this.users[socket.id] = user

        if (process.env.debugPackets == 'true') this.handler.log.info(`[Server] Connection from: ${socket.id} ${user.address}`)

        socket.on('message', (message) => this.messageReceived(message, user))
        socket.on('disconnect', () => this.connectionLost(user))
    }

    messageReceived(message, user) {
        if (message.length > 1000 || message.length <= 1) return
        this.rateLimiter
            .consume(user.address)
            .then(() => {
                let payload = AES.decrypt(message, user.decryptionKey)
                if (process.env.debugPackets == 'true') this.handler.log.info(`[Server] Received: ${payload.toString(enc)} from ${user.address}`)
                this.handler.handle(payload.toString(enc), user)
            })
            .catch(() => {
                // Blocked user
            })
    }

    getUserId(user) {
        return user.data && user.data.id ? user.data.id : user.socket.id
    }

    connectionLost(user) {
        if (process.env.debugPackets == 'true') this.handler.log.info(`[Server] Disconnect from: ${user.socket.id} ${user.address}`)
        this.handler.close(user)
    }
}
