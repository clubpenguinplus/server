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
        return this.list.includes(item)
    }

    add(location) {
        this.list.push(location)

        // Db query
        this.db.locationInventories.create({
            userId: this.user.data.id,
            locationId: location,
        })
    }
}
