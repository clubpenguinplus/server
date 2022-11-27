import Room from '../objects/room/Room'
import WaddleRoom from '../objects/room/WaddleRoom'
import OpenIgloos from '../objects/room/OpenIgloos'
import Api from '../integration/Api'
import Discord from '../integration/Discord'
import Filter from '../integration/Filter'
import fs from 'fs'
import path from 'path'

export default class DataHandler {
    constructor(id, users, db, log) {
        this.id = id
        this.users = users
        this.db = db
        this.log = log
        this.discord = new Discord(this)

        this.api = new Api(this)

        this.partyData = {}

        this.usersById = {}
        this.modsOnPanel = {}
        this.maxUsers = process.env.maxUsers || 300

        this.openIgloos = new OpenIgloos()

        this.filter = new Filter(this)

        this.events = {}
        this.handlers = {}

        this.dir = `${__dirname}/game`

        this.init()
    }

    async init() {
        this.crumbs = {
            items: await this.db.getItems(),
            igloos: await this.db.getIgloos(),
            furnitures: await this.db.getFurnitures(),
            floorings: await this.db.getFloorings(),
            stamps: await this.db.getCStamps(),
        }

        this.rooms = await this.setRooms()

        await this.setWaddles()

        this.updateWorldPopulation()
        this.loadHandlers()

        this.log.info(`[DataHandler] Created DataHandler for server: ${this.id}`)
    }

    async setWaddles() {
        let waddles = await this.db.getWaddles()

        for (let waddle of waddles) {
            this.rooms[waddle.roomId].waddles[waddle.id] = new WaddleRoom(waddle)
        }
    }

    async setRooms() {
        let roomsData = await this.db.getRooms()
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

            this.fireEvent(identifier, args, user)
        } catch (error) {
            this.log.error(`[DataHandler] Error: ${error}`)
        }
    }

    fireEvent(event, args, user) {
        this.getEvent(event, args, user)
    }

    close(user) {
        if (!user) {
            return
        }

        user.updateStats()

        if (user.data) this.api.apiFunction('/logLogout', {user: user.data.id, ip: user.address})

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

            if (user.data && user.data.id && user.data.id in this.usersById) {
                delete this.usersById[user.data.id]
            }

            if (user.data && user.data.id) {
                this.openIgloos.remove(user)
            }

            delete this.users[user.socket.id]

            this.updateWorldPopulation()
        }, 2500)
    }

    get population() {
        return Object.keys(this.users).length
    }

    async updateWorldPopulation() {
        this.api.apiFunction('/setPopulation', {population: this.population, world: this.id})
    }

    broadcast(message) {
        for (let user of Object.values(this.users)) {
            // change this
            user.sendXt('e', message)
        }
    }

    loadHandlers() {
        fs.readdirSync(this.dir).forEach((handler) => {
            let handlerImport = require(path.join(this.dir, handler)).default
            let handlerObject = new handlerImport(this)

            this.handlers[handler.replace('.js', '').toLowerCase()] = handlerObject

            this.loadEvents(handlerObject)
        })
    }

    loadEvents(handler) {
        for (let event in handler.events) {
            this.events[event] = handler.events[event].bind(handler)
        }
    }

    getEvent(event, args, user) {
        try {
            this.events[event](args, user)
        } catch (error) {
            this.log.error(`[DataHandler] Event (${event}) not handled: ${error}`)
        }
    }
}
