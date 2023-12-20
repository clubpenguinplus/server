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

    medals(id) {
        let item = this.crumbs.items[id]
        item.medals = 0
        for (let gp of this.gearPenguinItems) {
            if (gp[0] == id) {
                item.medals = gp[1]
                break
            }
        }

        if (!item || item.medals < 1) {
            return false
        } else if (item.medals > this.user.data.medals) {
            this.user.sendXt('e', 64)
            return false
        } else {
            return item
        }
    }

    get gearPenguinItems() {
        return [
            [1149, 14],
            [2021, 10],
            [4223, 18],
            [6042, 8],
            [1150, 10],
            [2022, 10],
            [4224, 18],
            [6043, 8],
            [1217, 12],
            [4300, 10],
            [1201, 14],
            [4282, 20],
            [6057, 16],
            [4258, 20],
            [6049, 20]
        ]
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
        } else if (this.user.data.rank >= 4) {
            // Admins bypass unavailable items
            return item
        } else if (item.patched) {
            this.user.sendXt('e', 2)
            return false
        } else if (type == '' && !item.available) {
            this.user.sendXt('e', 2)
            return false
        } else {
            return item
        }
    }
}
