export default class IglooInventory {
    constructor(user, inventory) {
        this.user = user
        this.db = user.db
        this.igloos = user.crumbs.igloos
        this.list = inventory
    }

    get flat() {
        return this.list
    }

    includes(item) {
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i] == item) return true
        }
        return false
    }

    add(igloo) {
        if (this.includes(igloo)) return false
        this.list.push(igloo)

        // Db query
        this.db.iglooInventories.create({
            userId: this.user.data.id,
            iglooId: igloo
        })
        return true
    }
}
