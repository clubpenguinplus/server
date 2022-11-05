import Plugin from '../Plugin'

export default class Igloo extends Plugin {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'g#ai': this.addIgloo,
            'g#af': this.addFurniture,
            'g#au': this.updateIgloo,
            'g#ur': this.updateFurniture,
            'g#ag': this.updateFlooring,
            'g#um': this.updateMusic,
            'g#or': this.openIgloo,
            'g#cr': this.closeIgloo,
            'g#gr': this.getIgloos,
            'g#io': this.getIglooOpen,
        }
    }

    // Events

    async addIgloo(args, user) {
        let igloo = user.validatePurchase.igloo(args[0])
        if (!igloo) {
            return
        }

        user.iglooInventory.add(args[0])

        user.updateCoins(-igloo.cost)
        user.sendXt('aig', `${args[0]}%${user.data.coins}`)
    }

    addFurniture(args, user) {
        let furniture = user.validatePurchase.furniture(args[0])
        if (!furniture) {
            return
        }

        // If furniture added successfuly
        if (user.furnitureInventory.add(args[0])) {
            user.updateCoins(-furniture.cost)
            user.sendXt('af', `${args[0]}%${user.data.coins}`)
        }
    }

    async updateIgloo(args, user) {
        let igloo = this.getIgloo(user.data.id)
        if (!args[0] || !igloo || igloo != user.room || !user.iglooInventory.includes(args[0]) || igloo.type == args[0]) {
            return
        }

        // check crumb
        let iglooItem = true
        if (!iglooItem) {
            return
        }

        await igloo.clearFurniture()

        igloo.update({type: args[0]})
        igloo.update({flooring: 0})
        igloo.type = args[0]
        igloo.flooring = 0

        // Refresh igloo
        igloo.refresh(user)
    }

    async updateFurniture(args, user) {
        let igloo = this.getIgloo(user.data.id)
        let furniture = args[0].split(',')
        if (!Array.isArray(furniture) || !igloo || igloo != user.room) {
            return
        }

        await igloo.clearFurniture()

        let quantities = {}

        for (let item of furniture) {
            item = item.split('|')
            let id = item[0]
            if (!item || !user.furnitureInventory.includes(id)) {
                continue
            }

            // Update quantity
            quantities[id] = quantities[id] ? quantities[id] + 1 : 1

            // Validate quantity
            if (quantities[id] > user.furnitureInventory.list[id]) {
                continue
            }

            igloo.furniture.push(item)
            this.db.userFurnitures.create({id: item[0], x: item[1], y: item[2], rotation: item[3], frame: item[4], userId: user.data.id})
        }
    }

    updateFlooring(args, user) {
        let igloo = this.getIgloo(user.data.id)
        if (!igloo || igloo != user.room) {
            return
        }

        let flooring = user.validatePurchase.flooring(args[0])
        if (!flooring) {
            return
        }

        igloo.update({flooring: args[0]})
        igloo.flooring = args[0]

        user.updateCoins(-flooring.cost)
        user.sendXt('uf', `${args[0]}%${user.data.coins}`)
    }

    updateMusic(args, user) {
        let igloo = this.getIgloo(user.data.id)
        if (!igloo || igloo != user.room || igloo.music == args[0]) {
            return
        }

        igloo.update({music: args[0]})
        igloo.music = args[0]

        user.sendXt('um', args[0])
    }

    openIgloo(args, user) {
        let igloo = this.getIgloo(user.data.id)
        if (igloo && igloo == user.room) {
            this.openIgloos.add(user)
        }
    }

    closeIgloo(args, user) {
        let igloo = this.getIgloo(user.data.id)
        if (igloo && igloo == user.room) {
            this.openIgloos.remove(user)
        }
    }

    getIgloos(args, user) {
        user.sendXt('gi', this.openIgloos.flat)
    }

    getIglooOpen(args, user) {
        let open = this.openIgloos.includes(args[0])
        user.sendXt('gio', open)
    }

    // Functions

    getIgloo(id) {
        let internalId = id + process.env.iglooIdOffset

        if (internalId in this.rooms) {
            return this.rooms[internalId]
        }
    }
}
