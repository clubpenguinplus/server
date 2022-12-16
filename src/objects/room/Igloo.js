import Room from './Room'

export default class Igloo extends Room {
    constructor(data, db, iglooIdOffset) {
        super(data)

        this.db = db
        this.likesList = []
    }

    get string() {
        let users = this.strings.join()
        let furniture = this.furniture.map((f) => `${f.id}|${f.furnitureId}|${f.x}|${f.y}|${f.frame}|${f.rotation}`).join(',')

        return `${this.userId}%${users}%${this.type}%${this.flooring}%${this.music}%${this.location}%${furniture}`
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

    async update(query) {
        let user = await this.db.getUserById(this.userId)

        let igloo = await this.db.userIgloos.findOne({where: {userId: this.userId, iglooId: user.dataValues.current_igloo}})

        if (!igloo) {
            igloo = await this.db.userIgloos.create({
                userId: this.userId,
                iglooId: user.dataValues.current_igloo,
                type: 1,
                flooring: 0,
                music: 0,
                location: 1,
            })
        }

        this.db.userIgloos.update(query, {where: {userId: this.userId, iglooId: user.dataValues.current_igloo}})
    }

    async clearFurniture() {
        let user = await this.db.getUserById(this.userId)

        await this.db.userFurnitures.destroy({where: {userId: this.userId, iglooId: user.dataValues.current_igloo}})
        this.furniture = []
    }

    async changeIgloo(iglooId) {
        let igloo = await this.db.getIgloo(this.userId, iglooId)
        if (!igloo) {
            igloo = await this.db.userIgloos.create({
                userId: this.userId,
                iglooId: iglooId,
                type: 1,
                flooring: 0,
                music: 0,
                location: 1,
                locked: 1,
            })
            igloo.furniture = []
        }
        for (let i in igloo) {
            this[i] = igloo[i]
        }
        this.refresh()
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
