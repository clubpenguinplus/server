import RateLimiterFlexible from 'rate-limiter-flexible'
import AES from 'crypto-js/aes'
import enc from 'crypto-js/enc-utf8'

import express from 'express'
import bodyParser from 'body-parser'
import http from 'http'

import User from '../objects/user/User'

export default class Server {
    constructor(id, users, db, handler, iteration) {
        this.users = users
        this.db = db
        this.handler = handler

        this.app = express()
        http.createServer(this.app)
        const bodyParser = require('body-parser')

        this.httpServer = this.app.listen(parseInt(process.env.startingPort) + iteration, () => {
            this.handler.log.info(`[Server] Started world ${id} on port ${parseInt(process.env.startingPort) + iteration}`)
        })

        this.app.use(bodyParser.urlencoded({extended: true}))

        this.app.post('/endgame', (req, res) => {
            req.body = JSON.parse(Object.keys(req.body)[0])
            if (req.body.user && this.handler.usersById[req.body.user]) {
                this.handler.usersById[req.body.user].endAS3Game(req.body.auth, req.body.game, req.body.score, req.body.endroom)
            }
            res.send('OK')
        })

        this.app.post('/stampearned', (req, res) => {
            req.body = JSON.parse(Object.keys(req.body)[0])
            if (req.body.user && this.handler.usersById[req.body.user]) {
                this.handler.usersById[req.body.user].stampEarnedAS3(req.body.auth, req.body.stamp)
            }
            res.send('OK')
        })

        let io = this.createIo({
            cors: {
                origin: process.env.corsOrigin || '*',
                methods: ['GET', 'POST'],
            },
            path: '/socket/',
        })

        this.rateLimiter = new RateLimiterFlexible.RateLimiterMemory({
            // 20 events allowed per second
            points: 20,
            duration: 1,
        })

        io.on('connection', this.connectionMade.bind(this))
    }

    createIo(options) {
        return require('socket.io')(this.httpServer, options)
    }

    connectionMade(socket) {
        let user = new User(socket, this.handler)

        this.users[socket.id] = user

        this.handler.log.info(`[Server] Connection from: ${socket.id} ${user.address}`)

        socket.on('message', (message) => this.messageReceived(message, user))
        socket.on('disconnect', () => this.connectionLost(user))
    }

    messageReceived(message, user) {
        if (message.length > 1000 || message.length <= 1) return
        this.rateLimiter
            .consume(user.address)
            .then(() => {
                let payload = AES.decrypt(message, `Client${new Date().getUTCHours()}Key`)
                this.handler.log.info(`[Server] Received: ${payload.toString(enc)} from ${user.address}`)
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
        this.handler.log.info(`[Server] Disconnect from: ${user.socket.id} ${user.address}`)
        this.handler.close(user)
    }
}
