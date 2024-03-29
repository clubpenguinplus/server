import Handler from '../Handler'

export default class Item extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            's#up': this.updatePlayer,
            'i#ai': this.addItem,
            's#upr': this.removeItem,
            'i#aim': this.addItemWithMedals
        }

        this.items = this.crumbs.items
    }

    updatePlayer(args, user) {
        let item = this.items[args[0]]
        if (!item || item.type == 10 || !user.inventory.list.includes(parseInt(args[0]))) {
            return
        }

        let slot = this.items.slots[item.type - 1]
        user.setItem(slot, args[0])
    }

    async addItem(args, user) {
        args[0] = parseInt(args[0])

        let item = await user.validatePurchase.item(args[0])
        if (!item) {
            return
        }

        let slot = this.items.slots[item.type - 1]
        user.inventory.add(args[0])

        user.updateCoins(-item.cost)
        user.sendXt('ai', `${args[0]}%${item.name}%${slot}%${user.data.coins}`)
        this.handler.analytics.transaction(user.data.id, -item.cost, `purchase of item ${args[0]} : ${item.name}`)
    }

    async addItemWithMedals(args, user) {
        args[0] = parseInt(args[0])

        let item = await user.validatePurchase.medals(args[0])
        if (!item) {
            return
        }

        let slot = this.items.slots[item.type - 1]
        user.inventory.add(args[0])

        user.updateMedals(-item.medals)
        user.sendXt('aim', `${args[0]}%${item.name}%${slot}%${user.data.medals}`)
        this.handler.analytics.transaction(user.data.id, 0, `purchase of item ${args[0]} : ${item.name} with ${item.medals} medals`)
    }

    removeItem(args, user) {
        let type = args[0]
        if (!this.items.slots.includes(type)) {
            return
        }

        user.setItem(type, 0)
    }
}
