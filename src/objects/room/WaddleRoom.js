import SledInstance from '../instance/SledInstance'
import FindFourInstance from '../instance/FindFourInstance'

export default class WaddleRoom {
    constructor(data, id) {
        Object.assign(this, data)
        this.id = id

        this.users = new Array(data.seats).fill(null)
    }

    add(user) {
        let seat = this.users.indexOf(null)
        this.users[seat] = user

        user.waddle = this

        // Start game
        if (!this.users.includes(null) && this.game == 'sled') {
            return this.start()
        }

        user.sendXt('jt', `${this.id}%${seat}%${this.game}`)
        user.room.sendXt(user, 'ut', `${this.id}%${seat}%${user.data.username}%${this.game}`, [])

        if (!this.users.includes(null)) {
            this.start()
        }
    }

    remove(user) {
        let seat = this.users.indexOf(user)
        this.users[seat] = null

        user.waddle = null

        user.room.sendXt(user, 'ut', `${this.id}%${seat}`, [])
    }

    start() {
        let instance
        if (this.game == 'sled') instance = new SledInstance(this)
        if (this.game == 'four') instance = new FindFourInstance(this)

        if (this.game !== 'four') this.reset()
        instance.init()
    }

    reset() {
        for (let [seat, user] of this.users.entries()) {
            if (user) {
                this.users[seat] = null
                user.room.sendXt(user, 'ut', `${this.id}%${seat}`, [])
            }
        }
    }
}
