import Handler from '../Handler'
import Igloo from '../../objects/room/Igloo'

export default class Join extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'l#lp': this.loadPlayer,
            'j#js': this.joinServer,
            'j#jr': this.joinRoom,
            'j#jp': this.joinIgloo,
        }
    }

    // Events

    async loadPlayer(args, user) {
        user.room = this.getRandomSpawn()

        let friends = user.friend.list.map((friend) => `${friend.id}|${friend.username}|${friend.online ? 1 : 0}|${friend.isBff ? 1 : 0}`)

        user.sendXt('lp', `${user.string}%${user.room.id}%${user.data.joinTime}%${user.data.stampbookClasp}%${user.data.stampbookColor}%${user.data.stampbookPattern}%${user.data.customStamps}%${user.data.cannon_data}%${friends}%${user.ignore.users}%${user.inventory.flat}%${user.iglooInventory.flat}%${user.furnitureInventory.flat}%${user.stamps.flat}%${user.postcards}%${await this.db.getPendingFriends(user.data.id)}%${user.flooringInventory.flat}%${user.locationInventory.flat}%${user.sessionId}`)
    }

    joinServer(args, user) {
        user.room.add(user)
    }

    // Limit this to 1/2 uses per second
    joinRoom(args, user) {
        user.joinRoom(this.rooms[args[0]], args[1], args[2])
    }

    async joinIgloo(args, user) {
        let igloo = await this.getIgloo(args[0])
        user.joinRoom(igloo, args[1], args[2])
    }

    // Functions

    getRandomSpawn() {
        let spawns = Object.values(this.rooms).filter((room) => room.spawn && !room.isFull)

        // All spawns full
        if (!spawns.length) {
            spawns = Object.values(this.rooms).filter((room) => !room.game && !room.isFull)
        }

        return spawns[Math.floor(Math.random() * spawns.length)]
    }

    async getIgloo(id) {
        let internalId = id + process.env.iglooIdOffset // Ensures igloos are above all default rooms

        if (!(internalId in this.rooms)) {
            let igloo = await this.db.getIgloo(id)
            igloo = igloo || {
                userId: id,
                type: 1,
                flooring: 0,
                music: 0,
                location: 1,
                furniture: [],
            }
            if (!igloo) return null

            this.rooms[internalId] = new Igloo(igloo, this.db, process.env.iglooIdOffset)
        }

        return this.rooms[internalId]
    }
}
