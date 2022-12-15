import Handler from '../Handler'

export default class Igloo extends Handler {
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
            'g#gi': this.getIglooData,
            'g#io': this.getIglooOpen,
            'g#li': this.likeIgloo, // add the event for liking an igloo
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
            item = {furnitureId: item[0], x: item[1], y: item[2], rotation: item[3], frame: item[4]}
            let id = item.furnitureId
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
            item = await this.db.userFurnitures.create({furnitureId: item.furnitureId, iglooId: user.data.current_igloo, x: item.x, y: item.y, rotation: item.rotation, frame: item.frame, userId: user.data.id})
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

    async getIglooData(args, user) {
        let igloo = (await this.db.getIgloo(user.data.id, args[0])) || {
            iglooId: args[0],
            type: 1,
            flooring: 0,
            music: 0,
            location: 1,
            furniture: [],
        }
        let furniture = igloo.furniture.map((f) => `${f.id}|${f.furnitureId}|${f.x}|${f.y}|${f.frame}|${f.rotation}`).join(',')

        user.sendXt('gid', `${igloo.iglooId}%%${igloo.type}%${igloo.flooring}%${igloo.music}%${igloo.location}%${furniture}`)
    }

    // Functions

    getIgloo(id) {
        let internalId = id + process.env.iglooIdOffset

        if (internalId in this.rooms) {
            return this.rooms[internalId]
        }
    }

    async likeIgloo(args, user) {
        let igloo = this.getIgloo(args[0]) // get the igloo of the user whose igloo is being liked

        // check if the user liking the igloo has already liked the igloo
        let isLiked = this.igloos.likesList.includes(user.data.id)
        if (isLiked) {
            return
        }

        // add the like to the database
        let like = await this.db.getIglooLikes.create({userId: args[0], likedById: user.data.id})

        // add the like to the igloo's likesList - need to figure out importing igloo object into handler
        this.rooms.igloo.addLike(user.data.id)

        // send a response to the user liking the igloo
        user.sendXt('li', `${args[0]}%${user.data.id}`)

        // send a notification to the user whose igloo was liked
        igloo.user.sendXt('nli', `${args[0]}%${user.data.username}`)
    }
}
