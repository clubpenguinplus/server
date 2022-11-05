import RateLimiterFlexible from 'rate-limiter-flexible'
import AES from 'crypto-js/aes'
import enc from 'crypto-js/enc-utf8'

import User from '../objects/user/User'

export default class Server {
    constructor(id, users, db, handler, iteration) {
        this.users = users
        this.db = db
        this.handler = handler

        let io = this.createIo(
            {
                https: process.env.socketHTTPS == true ? true : false,
                ssl:
                    process.env.socketHTTPS == 'true'
                        ? {
                              cert: '/path/to/cert.crt',
                              ca: '/path/to/ca.ca-bundle',
                              key: '/path/to/key.key',
                          }
                        : {},
            },
            {
                cors: {
                    origin: process.env.corsOrigin || '*',
                    methods: ['GET', 'POST'],
                },
                path: '/',
            }
        )

        this.rateLimiter = new RateLimiterFlexible.RateLimiterMemory({
            // 20 events allowed per second
            points: 20,
            duration: 1,
        })

        this.server = io.listen(parseInt(process.env.startingPort) + iteration)
        this.server.on('connection', this.connectionMade.bind(this))

        this.handler.log.info(`[Server] Started world ${id} on port ${parseInt(process.env.startingPort) + iteration}`)
    }

    createIo(cnfg, options) {
        let server = cnfg.https ? this.httpsServer(cnfg.ssl) : this.httpServer()

        return require('socket.io')(server, options)
    }

    httpServer() {
        return require('http').createServer()
    }

    httpsServer(ssl) {
        let fs = require('fs')
        let loaded = {}

        // Loads ssl files
        for (let key in ssl) {
            loaded[key] = fs.readFileSync(ssl[key]).toString()
        }

        return require('https').createServer(loaded)
    }

    connectionMade(socket) {
        let user = new User(socket, this.handler)
        user.address = this.getSocketAddress(socket)

        this.users[socket.id] = user

        this.handler.log.info(`[Server] Connection from: ${socket.id} ${user.address}`)

        socket.on('message', (message) => this.messageReceived(message, user))
        socket.on('disconnect', () => this.connectionLost(user))
    }

    getSocketAddress(socket) {
        let headers = socket.handshake.headers

        if (headers['x-forwarded-for']) {
            return headers['x-forwarded-for'].split(',')[0]
        }

        return socket.handshake.address
    }

    messageReceived(message, user) {
        let id = this.getUserId(user)

        this.rateLimiter
            .consume(id)
            .then(() => {
                let payload = AES.decrypt(message, `Client${new Date().getUTCHours()}Key`)
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
        this.handler.log.info(`[Server] Disconnect from: ${user.socket.id}`)
        this.handler.close(user)
    }
}
