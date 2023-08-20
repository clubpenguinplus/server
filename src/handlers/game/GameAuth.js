import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import {v4 as uuid} from 'uuid'

import Handler from '../Handler'

export default class GameAuth extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'auth#g': this.gameAuth,
            'auth#m': this.modAuth,
            'auth#u': this.unlockAuth
        }
    }

    // Events

    async gameAuth(args, user) {
        // Already authenticated
        if (user.authenticated) {
            return
        }

        let userData = await user.db.getUserByUsername(args[0])
        if (!userData) {
            return user.close()
        }

        user.data = userData

        // Full server
        if (this.handler.population > this.handler.maxUsers && !user.isModerator) {
            return user.close()
        }

        // Check banned
        let activeBan = await user.db.getActiveBan(user.data.id)
        if (activeBan || user.data.permaBan) {
            return user.close()
        }

        let success = await this.compareLoginKey(args, user)
        if (!success) {
            return user.sendXt('cwe', 39)
        }

        // Success
        user.sessionId = uuid()
        this.usersBySessionId[user.sessionId] = user.data.id
        this.usersById[user.data.id] = user
        user.crumbs = this.crumbs

        await user.setFriends(await user.db.getFriends(user.data.id))
        await user.setIgnores(await user.db.getIgnores(user.data.id))
        user.setInventory(await user.db.getInventory(user.data.id))
        user.setIglooInventory(await user.db.getIglooInventory(user.data.id))
        user.setFurnitureInventory(await user.db.getFurnitureInventory(user.data.id))
        user.setFlooringInventory(await user.db.getFlooringInventory(user.data.id))
        user.setLocationInventory(await user.db.getLocationInventory(user.data.id))
        user.setStamps(await user.db.getStamps(user.data.id))
        user.setPostcards(await user.db.getPostcards(user.data.id))

        user.currentLanguage = args[4]

        // Send response
        let serverKey = crypto.randomBytes(32).toString('hex')
        let clientKey = crypto.randomBytes(32).toString('hex')

        let packet = success.token ? `${serverKey}%${clientKey}%${success.token}` : `${serverKey}%${clientKey}`
        user.sendXt('ga', packet)

        user.encryptionKey = serverKey
        user.decryptionKey = clientKey

        this.handler.analytics.login(user.data.id, user.address)
    }

    async modAuth(args, user) {
        // Already authenticated
        if (user.authenticated) {
            return
        }

        let userData = await user.db.getUserByUsername(args[0])
        if (!userData) {
            return user.close()
        }

        if (userData.rank < 3) {
            return user.sendXt('cwe', 40)
        }

        user.data = userData

        // Check banned
        let activeBan = await user.db.getActiveBan(user.data.id)
        if (activeBan || user.data.permaBan) {
            return user.close()
        }

        let success = await this.compareLoginKey(args, user)
        if (!success) {
            return user.sendXt('cwe', {error: 39})
        }

        user.sendXt('ma', `${user.data.id}%${user.data.rank}`)

        this.handler.modsOnPanel[user.data.id] = user
    }

    async unlockAuth(args, user) {
        // Already authenticated
        if (user.authenticated) {
            return
        }

        let userData = await user.db.getUserByUsername(args[0])
        if (!userData) {
            return user.close()
        }

        user.data = userData

        // Check banned
        let activeBan = await user.db.getActiveBan(user.data.id)
        if (activeBan || user.data.permaBan) {
            return user.close()
        }

        let success = await this.compareLoginKey(args, user)
        if (!success) {
            return user.sendXt('cwe', {error: 39})
        }

        user.sendXt('ua')
    }

    // Functions

    async compareLoginKey(args, user) {
        let decoded
        let token

        // Verify JWT
        try {
            decoded = jwt.verify(user.data.loginKey, process.env.cryptoSecret)
        } catch (err) {
            return false
        }

        // Verify hash
        let address = user.socket.handshake.address
        let userAgent = user.socket.request.headers['user-agent']
        let match = await bcrypt.compare(`${user.data.username}${args[1]}${address}${userAgent}`, decoded.hash)

        if (!match) {
            return false
        }

        // Disconnect if already logged in
        if (user.data.id in this.usersById) {
            this.usersById[user.data.id].sendXt('cwe', 41)
            this.usersById[user.data.id].close()
        }

        user.authenticated = true
        return true
    }
}
