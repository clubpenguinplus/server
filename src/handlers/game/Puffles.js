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
        }
    }

    async adoptPuffle(args, user) {
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
        let puffles = await this.db.getPuffles(userId)
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
                name: wellbeing.name,
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
                count: puffleCount,
            })
        }
    }
}
