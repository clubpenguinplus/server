import Room from '../objects/room/Room'
import WaddleRoom from '../objects/room/WaddleRoom'
import OpenIgloos from '../objects/room/OpenIgloos'
import Discord from '../integration/Discord'
import Filter from '../integration/Filter'
import BaseHandler from './BaseHandler'
import fs from 'fs'

export default class DataHandler extends BaseHandler {
    constructor(id, users, db, log) {
        super(id, users, db, log)
        this.discord = new Discord(this)

        this.partyData = {}

        this.usersById = {}
        this.usersBySessionId = {}
        this.modsOnPanel = {}
        this.maxUsers = process.env.maxUsers || 300

        this.openIgloos = new OpenIgloos()

        this.filter = new Filter(this)

        this.dir = `${__dirname}/game`

        this.init()
    }

    async init() {
        this.crumbs = {
            floorings: this.getCrumb('floorings'),
            furnitures: this.getCrumb('furnitures'),
            igloos: this.getCrumb('igloos'),
            items: this.getCrumb('items'),
            locations: this.getCrumb('locations'),
            mascots: this.getCrumb('mascots'),
            puffles: this.getCrumb('puffles'),
            stamps: this.getCrumb('stamps'),
        }

        this.rooms = await this.setRooms()

        await this.setWaddles()

        this.loadHandlers()

        this.log.info(`[${this.id}] Created DataHandler for server: ${this.id}`)
    }

    async setWaddles() {
        let waddles = this.getCrumb('waddles')

        for (let w in waddles) {
            let waddle = waddles[w]
            this.rooms[waddle.roomId].waddles[w] = new WaddleRoom(waddle, w)
        }
    }

    async setRooms() {
        let roomsData = this.getCrumb('rooms')
        fs.writeFileSync('./crumbs/rooms.json', JSON.stringify(roomsData))
        let rooms = {}

        for (let data of roomsData) {
            rooms[data.id] = new Room(data, this)
        }

        return rooms
    }

    handle(message, user) {
        try {
            let msgAsArray = message.split('%')
            let type = msgAsArray[1]
            let isServer = msgAsArray[2]
            let identifier = msgAsArray[3]
            let args = msgAsArray.slice(4)

            if (type != 'xt' || isServer != 's') return this.log.error('[Network] Invalid message type:', type)

            // Only allow game_auth until user is authenticated
            if (!user.authenticated && !identifier.includes('auth')) {
                user.sendXt('cwe', 26)
                user.close()
                return
            }

            this.events.emit(identifier, args, user)
        } catch (error) {
            this.log.error(`[${this.id}] Error: ${error}`)
        }
    }

    close(user) {
        if (!user) {
            return
        }

        if (user.data) this.analytics.logout(user.data.id)

        setTimeout(() => {
            if (user.room) {
                user.room.remove(user)
            }

            if (user.friend) {
                user.friend.sendOffline()
            }

            if (user.waddle) {
                user.waddle.remove(user)
            }

            if (user.sessionId && user.sessionId in this.usersBySessionId) {
                delete this.usersBySessionId[user.sessionId]
            }

            if (user.data && user.data.id && user.data.id in this.usersById) {
                delete this.usersById[user.data.id]
            }

            if (user.data && user.data.id) {
                this.openIgloos.remove(user)
            }

            delete this.users[user.socket.id]
        }, 2500)
    }

    broadcast(message) {
        for (let user of Object.values(this.users)) {
            // change this
            user.sendXt('e', message)
        }
    }
}
