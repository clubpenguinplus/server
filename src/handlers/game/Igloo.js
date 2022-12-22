import Handler from '../Handler'

export default class Igloo extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'g#ai': this.addIgloo,
            'g#af': this.addFurniture,
            'g#au': this.updateIgloo,
            'g#al': this.updateLocation,
            'g#ur': this.updateFurniture,
            'g#ag': this.updateFlooring,
            'g#um': this.updateMusic,
            'g#or': this.openIgloo,
            'g#cr': this.closeIgloo,
            'g#gr': this.getIgloos,
            'g#gi': this.getIglooData,
            'g#io': this.getIglooOpen,
            'g#li': this.likeIgloo,
            'g#ci': this.changeIgloo,
            'g#il': this.getIglooLikes,
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
        if (!args[0] || !igloo || igloo != user.room || !user.iglooInventory.includes(parseInt(args[0])) || igloo.type == args[0]) {
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

    async updateLocation(args, user) {
        let igloo = this.getIgloo(user.data.id)
        if (!args[0] || !igloo || igloo != user.room || !user.locationInventory.includes(parseInt(args[0])) || igloo.location == args[0]) {
            return
        }

        igloo.update({location: args[0]})
        igloo.location = args[0]

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
        let igloo = await this.db.getIgloo(user.data.id, args[0])
        igloo = igloo || {
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

    async changeIgloo(args, user) {
        user.data.current_igloo = parseInt(args[0])
        user.update({current_igloo: user.data.current_igloo})
        let igloo = this.getIgloo(user.data.id)
        if (igloo) {
            await igloo.changeIgloo(user.data.current_igloo)
        }
    }

    async getIglooLikes(args, user) {
        let u = await this.db.getUserById(args[0])
        if (!u) return

        if (!args[1]) {
            args[1] = u.dataValues.current_igloo
        }

        let likes = await this.db.getIglooLikes(args[0], args[1])

        let likeList = []
        likes.forEach(async (like) => {
            let u = await this.db.getUserById(like)
            if (u) {
                likeList.push(`${u.dataValues.id}|${u.dataValues.username_approved ? u.dataValues.username : `P${u.dataValues.id}`}|${u.dataValues.head}|${u.dataValues.face}|${u.dataValues.neck}|${u.dataValues.body}|${u.dataValues.hand}|${u.dataValues.feet}|${u.dataValues.color}`)
            }
            if (likeList.length == likes.length) {
                user.sendXt('gl', `${args[0]}%${args[1]}%${likeList.join(',')}`)
            }
        })
    }

    async likeIgloo(args, user) {
        let i = args[0]
        let u = await this.db.getUserById(i)
        if (!u) return
        let likes = await this.db.getIglooLikes(i, u.dataValues.current_igloo)
        if (likes.includes(user.data.id)) return
        await this.db.iglooLikes.create({userId: i, iglooId: u.dataValues.current_igloo, likerId: user.data.id})
        this.getIgloo(i).updateLikes()
    }

    // Functions

    getIgloo(id) {
        let internalId = parseInt(id) + process.env.iglooIdOffset

        if (internalId in this.rooms) {
            return this.rooms[internalId]
        }
    }
}
