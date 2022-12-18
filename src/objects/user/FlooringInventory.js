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
        return this.list.includes(item)
    }

    add(flooring) {
        this.list.push(flooring)

        // Db query
        this.db.flooringInventories.create({
            userId: this.user.data.id,
            flooringId: flooring,
        })
    }
}
