import Room from './Room'

export default class Igloo extends Room {
    constructor(data, db, iglooIdOffset) {
        super(data)

        this.db = db
        this.likesList = []
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
        if (this.users[user.data.id]) this.remove(user)
        this.users[user.data.id] = user

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

    async getLikes() {
        let likes = this.db.getIglooLikes(this.userId)
        this.likeslist.push({
            likedBy: likes.likedById,
        })
    }

    addLike(id) {
        if (this.likeslist.includes(id)) return
        this.db.getIglooLikes.update({likedById: id}, {where: {userId: this.userId}})
    }

    removeLIke(id) {
        this.db.getIglooLikes.destroy({where: {userId: this.userId, likedById: id}})
    }
}
