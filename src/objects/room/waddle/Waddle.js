import InstanceFactory from '../../instance/InstanceFactory'

export default class Waddle {
    constructor(data) {
        Object.assign(this, data)

        this.users = new Array(data.seats).fill(null)
    }

    get notFull() {
        return this.users.includes(null)
    }

    add(user) {
        if (this.game === 'card' && !user.cards.hasCards) {
            return
        }

        let seat = this.users.indexOf(null)
        this.users[seat] = user

        user.waddle = this

        // Start game
        if (!this.users.includes(null)) {
            return this.start()
        }

        user.sendXt('jt', `${this.id}%${seat}%${this.game}`)
        user.room.sendXt(user, 'ut', `${this.id}%${seat}%${user.data.username}%${this.game}`, [])
    }

    remove(user) {
        let seat = this.users.indexOf(user)
        this.users[seat] = null

        user.waddle = null

        user.room.sendXt(user, 'ut', `${this.id}%${seat}%${null}%${this.game}`, [])
    }

    start() {
        let instance = InstanceFactory.createInstance(this)

        this.reset()
        instance.init()
    }

    reset() {
        for (let user of this.users.filter(Boolean)) {
            this.remove(user)
        }
    }
}
