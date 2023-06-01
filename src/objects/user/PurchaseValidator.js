export default class PurchaseValidator {
    constructor(user) {
        this.user = user
        this.crumbs = user.crumbs
        this.analytics = user.handler.analytics
    }

    item(id, isFree = false) {
        return this.validate(id, 'items', this.user.inventory, isFree)
    }

    igloo(id, isFree = false) {
        return this.validate(id, 'igloos', this.user.iglooInventory, isFree)
    }

    furniture(id, isFree = false) {
        return this.validate(id, 'furnitures', [], isFree)
    }

    flooring(id, isFree = false) {
        return this.validate(id, 'floorings', this.user.flooringInventory, isFree)
    }

    location(id, isFree = false) {
        return this.validate(id, 'locations', this.user.locationInventory, isFree)
    }

    async validate(id, type, includes = [], isFree = false) {
        let item = this.crumbs[type][id]

        if (!item) {
            return false
        } else if (item.cost > this.user.data.coins && !isFree) {
            this.user.sendXt('e', 0)
            return false
        } else if (includes.includes(id)) {
            this.user.sendXt('e', 1)
            return false
        } /* else if (this.user.data.rank >= 4) {
            // Admins bypass unavailable items
            return item
        }  else if (item.patched) {
            this.user.sendXt('e', 2)
            return false
        } else if (type == 'items' && !(await this.analytics.getItemAvailability(id))) {
            this.user.sendXt('e', 2)
            return false
        }  */ else {
            return item
        }
    }
}
