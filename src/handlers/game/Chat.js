import Handler from '../Handler'

export default class Chat extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'm#sm': this.sendMessage,
            'u#ss': this.sendSafe,
            'u#se': this.sendEmote
        }

        this.commands = {
            users: this.userPopulation,
            broadcast: this.broadcast,
            ai: this.addItem,
            af: this.addFurniture,
            ac: this.addCoins,
            aig: this.addIgloo,
            afl: this.addFlooring,
            al: this.addLocation,
            addall: this.addAll
        }

        this.bindCommands()
    }

    // Events

    sendMessage(args, user) {
        // Todo: message validation
        if (args[0].startsWith('!')) {
            return this.processCommand(args[0], user)
        }
        this.processMessage(args[0], user)
    }

    processMessage(message, user) {
        if (message.length < 1 || message.length > 100) {
            return
        }

        // moderators bypass the filter
        let whitelist = user.data.rank >= 3 ? false : this.handler.filter.checkWhitelistFilter(message)

        let blacklist = this.handler.filter.checkBlacklistFilter(message)

        if (blacklist) {
            user.room.sendChat(user, message, 0)
            this.handler.analytics.chatMessage(user.data.id, message, user.room.id, 0)

            if (user.sesWarns >= 2) {
                return this.chatBan(user, blacklist)
            }

            // warning prompt
            user.sendXt('w', 'c')
            user.sesWarns++
            return
        }

        if (whitelist) {
            user.room.sendChat(user, message, 1)
            this.handler.analytics.chatMessage(user.data.id, message, user.room.id, 1)
            return
        }

        if (user.data.rank >= 3 && message.split(' ')[0] == 'SCBYPASS') {
            user.room.sendChat(user, message.split(' ').slice(1).join(' '), 3)
            this.handler.analytics.chatMessage(user.data.id, message, user.room.id, 3)
            return
        }

        user.room.sendChat(user, message, 2)
        this.handler.analytics.chatMessage(user.data.id, message, user.room.id, 2)
    }

    sendSafe(args, user) {
        user.room.sendXt(user, 'ss', `${user.data.id}%${args[0]}`, [], true)
    }

    sendEmote(args, user) {
        user.room.sendXt(user, 'se', `${user.data.id}%${args[0]}`, [], true)
    }

    async chatBan(user, reason) {
        let date = new Date()
        let banCount = await this.db.getBanCount(user.data.id)
        let time = 24

        if (banCount == 0) {
            time = 24
        } else if (banCount == 1) {
            time = 72
        } else if (banCount == 2) {
            time = 168
        } else if (banCount == 3) {
            time = 672
        } else if (banCount == 4) {
            time = 2160
        } else if (banCount > 4) {
            await this.db.users.update({permaBan: true}, {where: {id: user.data.id}})
            user.sendXt('b', 'o')
            user.close()
            return
        }

        let expiry = date.getTime() + time * 60 * 60 * 1000

        await this.db.ban(user.data.id, expiry, null, `blacklist: ${reason}`)
        user.sendXt('b', 'c,' + time)
        user.close()
    }

    // Commands

    bindCommands() {
        for (let command in this.commands) {
            this.commands[command] = this.commands[command].bind(this)
        }
    }

    processCommand(message, user) {
        let msg = message.substring(1)
        let args = msg.split(' ')
        let command = args.shift()

        if (command in this.commands) {
            user.room.sendXt(user, 'fm', `${user.data.id}%${message}`, [], true)
            return this.commands[command](args, user)
        }
        this.processMessage(message, user)
    }

    userPopulation(args, user) {
        if (user.data.rank < 3) return
        user.sendXt('e', [10, this.handler.population])
    }

    broadcast(args, user) {
        if (user.data.rank < 5) return
        this.handler.broadcast(args.join(' '))
    }

    async addAll(args, user) {
        if (user.data.rank < 3) return

        for (let i of Object.keys(this.crumbs.items)) {
            let item = await user.validatePurchase.item(i, true)
            if (!item) {
                continue
            }

            let slot = this.crumbs.items.slots[item.type - 1]
            user.inventory.add(i)

            user.sendXt('ai', `${i}%${item.name}%${slot}%${user.data.coins}`)
        }

        for (let i of Object.keys(this.crumbs.furnitures)) {
            let item = await user.validatePurchase.furniture(i, true)
            if (!item) {
                continue
            }

            if (user.furnitureInventory.add(i)) {
                user.sendXt('af', `${i}%${user.data.coins}`)
            }
        }

        for (let i of Object.keys(this.crumbs.igloos)) {
            let item = await user.validatePurchase.igloo(i, true)
            if (!item) {
                continue
            }

            if (user.iglooInventory.add(i)) {
                user.sendXt('aig', `${i}%${item.name}%${user.data.coins}`)
            }
        }

        for (let i of Object.keys(this.crumbs.floorings)) {
            let item = await user.validatePurchase.flooring(i, true)
            if (!item) {
                continue
            }

            if (user.flooringInventory.add(i)) {
                user.sendXt('afl', `${i}%${user.data.coins}`)
            }
        }

        for (let i of Object.keys(this.crumbs.locations)) {
            let item = await user.validatePurchase.location(i, true)
            if (!item) {
                continue
            }

            if (user.locationInventory.add(i)) {
                user.sendXt('al', `${i}%${user.data.coins}`)
            }
        }
    }

    async addItem(args, user) {
        args[0] = parseInt(args[0])

        let item = await user.validatePurchase.item(args[0], true)
        if (!item) {
            return
        }

        let slot = this.crumbs.items.slots[item.type - 1]
        user.inventory.add(args[0])

        user.sendXt('ai', `${args[0]}%${item.name}%${slot}%${user.data.coins}`)
    }

    async addFurniture(args, user) {
        args[0] = parseInt(args[0])
        args[1] = parseInt(args[1])

        for (let i = 0; i < args[1]; i++) {
            let item = await user.validatePurchase.furniture(args[0], true)
            if (!item) {
                return
            }

            if (user.furnitureInventory.add(args[0])) {
                user.sendXt('af', `${args[0]}%${user.data.coins}`)
            }
        }
    }

    async addLocation(args, user) {
        args[0] = parseInt(args[0])

        let item = await user.validatePurchase.location(args[0], true)
        if (!item) {
            return
        }

        if (user.locationInventory.add(args[0])) {
            user.sendXt('al', `${args[0]}%${user.data.coins}`)
        }
    }

    async addIgloo(args, user) {
        args[0] = parseInt(args[0])

        let item = await user.validatePurchase.igloo(args[0], true)
        if (!item) {
            return
        }

        if (user.iglooInventory.add(args[0])) {
            user.sendXt('aig', `${args[0]}%${user.data.coins}`)
        }
    }

    async addFlooring(args, user) {
        args[0] = parseInt(args[0])

        let item = await user.validatePurchase.floorinf(args[0], true)
        if (!item) {
            return
        }

        if (user.flooringInventory.add(args[0])) {
            user.sendXt('afl', `${args[0]}%${user.data.coins}`)
        }
    }

    async addCoins(args, user) {
        args[0] = parseInt(args[0])

        user.updateCoins(args[0])
        user.sendXt('ac', user.data.coins)
    }
}
