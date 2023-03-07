export default class Inventory {
    constructor(user, inventory) {
        this.user = user
        this.db = user.db
        this.items = user.crumbs.items
        this.list = inventory
    }

    includes(item) {
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i] == item) return true
        }
        return false
    }

    get flat() {
        return this.list
    }

    /**
     * Adds an item to the users inventory.
     *
     * @param {number} item - Item ID
     */
    add(item) {
        this.list.push(item)

        // Db query
        try {
            this.db.inventories.create({userId: this.user.data.id, itemId: item})
        } catch (error) {
            this.handler.log.error(error)
        }
    }
}
