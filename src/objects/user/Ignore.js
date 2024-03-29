export default class Ignore {
    constructor(user) {
        this.user = user
        this.db = user.db

        // Ignore list
        this.list = []
    }

    get flat() {
        return this.list.map((user) => user.id)
    }

    get users() {
        return this.list.map((user) => `${user.id}|${user.username}`)
    }

    async init(ignores) {
        for (let ignore of ignores) {
            let user = await this.db.getUserById(ignore)
            this.list.push({id: user.dataValues.id, username: user.dataValues.username})
        }
    }

    includes(ignore) {
        return this.flat.includes(ignore)
    }

    addIgnore(id, username) {
        id = parseInt(id)
        this.list.push({id: id, username: username})
        this.user.sendXt('ia', `${id}%${username}`)
    }

    removeIgnore(id) {
        this.list = this.list.filter((obj) => obj.id != id)
        this.user.sendXt('ir', id)
    }
}
