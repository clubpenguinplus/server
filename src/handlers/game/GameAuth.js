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
            'auth#u': this.unlockAuth,
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
        await this.discord.logLogin(user.data.username)

        await user.setFriends(await user.db.getFriends(user.data.id))
        await user.setIgnores(await user.db.getIgnores(user.data.id))
        user.setInventory(await user.db.getInventory(user.data.id))
        user.setIglooInventory(await user.db.getIglooInventory(user.data.id))
        user.setFurnitureInventory(await user.db.getFurnitureInventory(user.data.id))
        user.setFlooringInventory(await user.db.getFlooringInventory(user.data.id))
        user.setLocationInventory(await user.db.getLocationInventory(user.data.id))
        user.setStamps(await user.db.getStamps(user.data.id))
        user.setPostcards(await user.db.getPostcards(user.data.id))

        // Send response
        user.sendXt('ga')
        if (success.token) {
            user.sendXt('at', success.token)
        }

        this.handler.api.apiFunction('/logLogin', {user: user.data.id, ip: user.address})

        // Update world population
        await this.handler.updateWorldPopulation()
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
        if (success.token) {
            user.sendXt('at', success.token)
        }

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
        if (success.token) {
            user.sendXt('at', success.token)
        }
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

        // Create new token
        if (args[3]) {
            token = await this.genAuthToken(user)
        }

        // Disconnect if already logged in
        if (user.data.id in this.usersById) {
            this.usersById[user.data.id].sendXt('cwe', 41)
            this.usersById[user.data.id].close()
        }

        user.authenticated = true

        if (token) return {success: true, token: token}
        return true
    }

    async genAuthToken(user) {
        let userData = await this.db.getUserById(user.data.id)
        let validator = userData.password
        let selector = userData.username

        return `${selector}:${validator}`
    }
}
