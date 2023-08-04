import Handler from '../Handler'

export default class Puffles extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'p#pn': this.adoptPuffle,
            'p#pg': this.getPuffles,
            'p#phg': this.getWellbeing,
            'p#pgs': this.getPuffleSpecies,
            'p#pw': this.walkPuffle,
            'p#pgc': this.getPuffleCount,
            'p#tby': this.toggleBackyard,
            'p#dig': this.puffleDig,
            'p#playanim': this.playPuffleAnimation
        }
    }

    async adoptPuffle(args, user) {
        let puffles = await this.db.getPuffleCount(user.data.id)
        if (puffles >= 75) {
            return user.sendXt('e', 53)
        }
        let type = args[0]
        let name = args[1].charAt(0).toUpperCase() + args[1].slice(1).toLowerCase()

        let cost = this.crumbs.puffles[type].cost

        if (cost > user.data.coins) {
            user.sendXt('e', 0)
            return
        }

        user.updateCoins(-cost)
        this.handler.analytics.transaction(user.data.id, -cost, `purchase of puffle ${type} : ${name}`)

        let puffle = await this.db.adoptPuffle(user.data.id, type, name)

        this.walkPuffle([puffle.id], user)
        user.sendXt('ac', user.data.coins)
    }

    async getPuffles(args, user) {
        if (!args[0]) {
            return
        }
        let userId = args[0]
        let puffles = await this.db.getPuffles(userId, args[1])
        puffles = puffles.map((puffle) => {
            return `${puffle.dataValues.id}|${puffle.dataValues.species}|${puffle.dataValues.name}|${puffle.dataValues.food}|${puffle.dataValues.play}|${puffle.dataValues.rest}|${puffle.dataValues.clean}`
        })
        user.sendXt('pgp', puffles.join('%'))
    }

    async getWellbeing(args, user) {
        if (!args[0]) {
            return
        }
        let puffleId = args[0]
        let wellbeing = await this.db.getWellbeing(puffleId)
        if (wellbeing) {
            user.sendXt('get_wellbeing', {
                puffleId: puffleId,
                clean: wellbeing.clean,
                food: wellbeing.food,
                play: wellbeing.play,
                rest: wellbeing.rest,
                name: wellbeing.name
            })
        }
    }

    async stopWalking(args, user) {
        if (user.data.walking !== 0) {
            const prevPuffle = user.data.walking
            user.data.walking = 0
            user.update({walking: user.data.walking})
            user.room.sendXt(user, 'psw', `${user.data.id}%${prevPuffle}`, [])
        }
    }

    async walkPuffle(args, user) {
        if (args[0] != 0) {
            user.data.walking = args[0]
            user.update({walking: user.data.walking})
            user.room.sendXt(user, 'ppw', `${user.data.id}%${args[0]}`, [])
        } else {
            this.stopWalking(args, user)
        }
    }

    async getPuffleSpecies(args, user) {
        if (!args[0]) {
            return
        }
        let puffleId = args[0]
        let puffleColor = await this.db.getPuffleSpecies(puffleId)
        if (puffleColor != undefined) {
            user.sendXt('pgs', `${args[1]}%${puffleColor}`)
        }
    }

    async getPuffleCount(args, user) {
        if (!user.data.id) {
            return
        }
        let puffleCount = await this.db.getPuffleCount(user.data.id)
        if (puffleCount) {
            user.sendXt('get_puffle_count', {
                count: puffleCount
            })
        }
    }

    async toggleBackyard(args, user) {
        let puffle = await this.db.getPuffle(user.data.id, args[0])

        if (args[1] == '0') {
            let iglooPuffles = await this.db.getPuffles(user.data.id)
            if (iglooPuffles.length >= 10) {
                this.db.userPuffles.update({isBackyard: 1}, {where: {id: iglooPuffles[0].dataValues.id}})
                user.sendXt('tby', `${iglooPuffles[0].dataValues.id}%1%${iglooPuffles[0].dataValues.id}|${iglooPuffles[0].dataValues.species}|${iglooPuffles[0].dataValues.name}|${iglooPuffles[0].dataValues.food}|${iglooPuffles[0].dataValues.play}|${iglooPuffles[0].dataValues.rest}|${iglooPuffles[0].dataValues.clean}`)
            }
        }

        if (puffle) {
            this.db.userPuffles.update({isBackyard: args[1]}, {where: {id: puffle.dataValues.id}})
            user.sendXt('tby', `${args[0]}%${args[1]}%${puffle.dataValues.id}|${puffle.dataValues.species}|${puffle.dataValues.name}|${puffle.dataValues.food}|${puffle.dataValues.play}|${puffle.dataValues.rest}|${puffle.dataValues.clean}`)
        }
    }

    async puffleDig(args, user) {
        const treasureTypes = ['coins', 'items', 'furniture' /*, 'puffle_items'*/, 'none']

        let walkingPuffle = await this.db.getPuffle(user.data.id, user.data.walking)

        let puffleAge = Math.floor((Date.now() - new Date(walkingPuffle.dataValues.dateAdopted).getTime()) / 1000 / 60 / 60 / 24)
        let puffleHealth = walkingPuffle.dataValues.food + walkingPuffle.dataValues.play + walkingPuffle.dataValues.rest + walkingPuffle.dataValues.clean

        let agePercent = puffleAge / 365
        let healthPercent = puffleHealth / 400

        let overallPercent = (agePercent + healthPercent * 2) / 3

        if (overallPercent < Math.random() && !args[0]) {
            return user.sendXt('pdig', 'none')
        }

        let treasureType = args[0] ? 'coins' : treasureTypes[Math.floor(Math.random() * treasureTypes.length)]

        if (treasureType == 'coins') {
            return this.digForCoins(user)
        }

        let treasurePool = this.crumbs.puffle_dig_pool[treasureType]
        switch (treasureType) {
            case 'items':
                let unownedItems = treasurePool.filter((item) => {
                    return !user.inventory.includes(item)
                })

                if (unownedItems.length == 0) {
                    return this.digForCoins(user)
                }

                let randomItem = unownedItems[Math.floor(Math.random() * unownedItems.length)]
                user.inventory.add(randomItem)
                user.sendXt('pdig', `item%${randomItem}`)
                break

            case 'furniture':
                let randomFurniture = treasurePool[Math.floor(Math.random() * treasurePool.length)]
                user.furnitureInventory.add(randomFurniture)
                user.sendXt('pdig', `furniture%${randomFurniture}`)
                break

            case 'puffle_items':
                break

            default:
                user.sendXt('pdig', 'none')
        }
    }

    digForCoins(user) {
        let min = 10
        let max = 250
        let randomNum = Math.floor(Math.random() * (max - min + 1)) + min
        user.updateCoins(randomNum)
        this.handler.analytics.transaction(user.data.id, randomNum, `puffle dig`)
        user.sendXt('pdig', `coins%${randomNum}`)
    }

    async playPuffleAnimation(args, user) {
        user.room.sendXt(user, 'pplayanim', `${user.data.id}%${args[0]}`, [], true)
    }
}
