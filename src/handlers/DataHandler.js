import Room from '../objects/room/Room'
import Waddle from '../objects/room/waddle/Waddle'
import OpenIgloos from '../objects/room/OpenIgloos'
import Filter from '../integration/Filter'
import BaseHandler from './BaseHandler'
import TableFactory from '../objects/room/table/TableFactory'

export default class DataHandler extends BaseHandler {
    constructor(id, users, db, log) {
        super(id, users, db, log)

        this.partyData = {
            cfcTotal: 0
        }

        this.usersById = {}
        this.usersBySessionId = {}
        this.modsOnPanel = {}
        this.maxUsers = process.env.maxUsers || 300

        this.openIgloos = new OpenIgloos()

        this.filter = new Filter(this)

        this.dir = `${__dirname}/game`

        this.translation = {
            enChars: 0,
            enMessages: 0,
            ptChars: 0,
            ptMessages: 0,
            esChars: 0,
            esMessages: 0
        }

        this.init()
    }

    async init() {
        this.crumbs = {
            challenges: this.getCrumb('challenges'),
            floorings: this.getCrumb('floorings'),
            furnitures: this.getCrumb('furnitures'),
            igloos: this.getCrumb('igloos'),
            items: this.getCrumb('items'),
            locations: this.getCrumb('locations'),
            mascots: this.getCrumb('mascots'),
            puffle_dig_pool: this.getCrumb('puffle_dig_pool'),
            puffles: this.getCrumb('puffles'),
            rooms: this.getCrumb('rooms'),
            stamps: this.getCrumb('stamps'),
            waddles: this.getCrumb('waddles'),
            worlds: this.getCrumb('worlds'),
            tables: this.getCrumb('tables')
        }

        this.updateCosts()

        this.rooms = await this.setRooms()

        await this.setWaddles()
        await this.setTables()

        this.loadHandlers()

        this.log.info(`[${this.id}] Created DataHandler for server: ${this.id}`)
    }

    setWaddles() {
        for (let w in this.crumbs.waddles) {
            let waddle = this.crumbs.waddles[w]
            this.rooms[waddle.roomId].waddles[w] = new Waddle(waddle)
        }
    }

    setTables() {
        for (let table of this.crumbs.tables) {
            let room = this.rooms[table.roomId]

            room.tables[table.id] = TableFactory.createTable(table, room)
        }
    }

    async setRooms() {
        let rooms = {}

        for (let data of this.crumbs.rooms) {
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

            user.events.emit(identifier, args, user)
            this.events.emit(identifier, args, user)
        } catch (error) {
            this.log.error(`[${this.id}] Error: ${error}`)
        }
    }

    close(user) {
        try {
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

                if (user.minigameRoom) {
                    user.minigameRoom.remove(user)
                }

                delete this.users[user.socket.id]
            }, 2500)
        } catch (error) {
            this.log.error(`[${this.id}] Error: ${error}`)
        }
    }

    broadcast(message) {
        for (let user of Object.values(this.users)) {
            // change this
            user.sendXt('e', message)
        }
    }
}
