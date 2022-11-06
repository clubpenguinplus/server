export default class PurchaseValidator {
    constructor(user) {
        this.user = user
        this.crumbs = user.crumbs
        this.api = user.handler.api
    }

    item(id) {
        return this.validate(id, 'items', this.user.inventory)
    }

    igloo(id) {
        return this.validate(id, 'igloos', this.user.iglooInventory)
    }

    furniture(id) {
        return this.validate(id, 'furnitures')
    }

    flooring(id) {
        return this.validate(id, 'floorings', [this.user.room.flooring])
    }

    async validate(id, type, includes = []) {
        let item = this.crumbs[type][id]

        if (!item) {
            return false
        } else if (item.cost > this.user.data.coins) {
            this.user.sendXt('e', 0)
            return false
        } else if (includes.includes(id)) {
            this.user.sendXt('e', 1)
            return false
        } else if (this.user.data.rank >= 4) {
            // Admins bypass unavailable items
            return item
        } else if (item.patched) {
            this.user.sendXt('e', 2)
            return false
        } else if (type == 'items' && !(await this.api.apiFunction('/getItemAvaliable', {item: id}))) {
            this.user.sendXt('e', 2)
            return false
        } else {
            return item
        }
    }
}
