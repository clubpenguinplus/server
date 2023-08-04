export default class IglooInventory {
    constructor(user, inventory) {
        this.user = user
        this.db = user.db
        this.igloos = user.crumbs.locations
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

    add(location) {
        if (this.includes(location)) return false
        this.list.push(location)

        // Db query
        this.db.locationInventories.create({
            userId: this.user.data.id,
            locationId: location
        })
        return true
    }
}
