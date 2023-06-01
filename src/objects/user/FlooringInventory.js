export default class IglooInventory {
    constructor(user, inventory) {
        this.user = user
        this.db = user.db
        this.igloos = user.crumbs.flooring
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

    add(flooring) {
        if (this.includes(flooring)) return false
        this.list.push(flooring)

        // Db query
        this.db.flooringInventories.create({
            userId: this.user.data.id,
            floorId: flooring,
        })
        return true
    }
}
