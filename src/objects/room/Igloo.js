import Room from './Room'

export default class Igloo extends Room {
    constructor(data, db, iglooIdOffset) {
        super(data)

        this.db = db
    }

    get string() {
        // return {
        //     igloo: this.userId,
        //     users: this.strings,
        //     type: this.type,
        //     flooring: this.flooring,
        //     music: this.music,
        //     location: this.location,
        //     furniture: this.furniture,
        // }

        let users = this.strings.join()

        return `${this.userId}%${users}%${this.type}%${this.flooring}%${this.music}%${this.location}%${this.furniture.join()}`
    }

    get id() {
        return this.userId + this.iglooIdOffset
    }

    add(user) {
        this.users[user.socket.id] = user

        user.sendXt('ji', this.string)
        this.sendXt(user, 'ap', user.string)
    }

    refresh(user) {
        for (let u of this.userValues) {
            u.x = 0
            u.y = 0
            u.frame = 1
        }
        this.sendXt(user, 'ji', this.string, [])
    }

    update(query) {
        this.db.userIgloos.update(query, {where: {userId: this.userId}})
    }

    async clearFurniture() {
        await this.db.userFurnitures.destroy({where: {userId: this.userId}})
        this.furniture = []
    }
}
