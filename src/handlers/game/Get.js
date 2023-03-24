import Handler from '../Handler'
import Sequelize from 'sequelize'

const Op = Sequelize.Op

export default class Get extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'u#gp': this.getPlayer,
            'u#gb': this.getBuddy,
            'u#gbs': this.getBuddies,
            'u#go': this.getOnline,
            'i#gp': this.getPin,
            's#gb': this.getStampbook,
            'ma#g': this.getMascots,
            'i#gi': this.getItemInfo,
            'i#gc': this.getCost,
        }
    }

    getString(user) {
        return `${user.dataValues.id}|${user.dataValues.username}|${user.dataValues.color}|${user.dataValues.head}|${user.dataValues.face}|${user.dataValues.neck}|${user.dataValues.body}|${user.dataValues.hand}|${user.dataValues.feet}|${user.dataValues.flag}|${user.dataValues.photo}|${user.dataValues.coins}||||${user.dataValues.rank}|${user.dataValues.stealthMode ? 1 : 0}|${user.dataValues.username_approved ? 1 : 0}|${user.dataValues.username_rejected ? 1 : 0}|${user.dataValues.walking}|${user.dataValues.epfStatus}|${new Date(user.dataValues.joinTime).getTime()}`
    }

    async getPlayer(args, user) {
        if (!args[0]) {
            return
        }

        if (args[0] in this.usersById) {
            user.sendXt('gp', this.usersById[args[0]].string)
            return
        }

        let userData = await this.db.getUserById(args[0])

        if (userData) {
            user.sendXt('gp', this.getString(userData))
        }
    }

    async getBuddy(args, user) {
        if (!args[0]) {
            return
        }

        if (args[0] in this.usersById) {
            user.sendXt('gb', this.usersById[args[0]].string)
            return
        }

        let userData = await this.db.getUserById(args[0])

        if (userData) {
            user.sendXt('gb', this.getString(userData))
        }
    }

    async getBuddies(args, user) {
        for (let buddy of args) {
            this.getBuddy([buddy], user)
        }
    }

    getPin(args, user) {
        let id = null
        let room = null
        let x = null
        let y = null

        user.sendXt('pin', `${id}%${room}%${x}%${y}`)
    }

    async getStampbook(args, user) {
        let stamps = await this.db.getStamps(args[0])
        let target = await this.db.getUserById(args[0])
        let inventory = await this.db.getInventory(args[0])
        let username = ''
        if (target.dataValues.username_approved == 1) {
            username = target.dataValues.username
        } else {
            username = 'P' + target.dataValues.id
        }

        let pins = []
        for (let i = 0; i < inventory.length; i++) {
            if (this.crumbs.items[inventory[i]].type == 7) {
                pins.push(inventory[i])
            }
        }

        user.sendXt('gsb', `${username}%${stamps.join()}%${target.dataValues.stampbookColor}%${target.dataValues.stampbookClasp}%${target.dataValues.stampbookPattern}%${pins.join()}`)
    }

    async getMascots(args, user) {
        let mascots = this.crumbs.mascots
        let marray = []
        for (let i = 0; i < mascots.length; i++) {
            marray.push(`${mascots[i].id}|${mascots[i].name}|${mascots[i].giveaway}|${mascots[i].stamp}`)
        }
        user.sendXt('gm', marray.join('%'))
    }

    async getOnline(args, user) {
        if (this.usersById[parseInt(args[0])]) {
            user.sendXt('on', args[0])
        }
    }

    async getItemInfo(args, user) {
        let item = this.crumbs[args[0]] ? this.crumbs[args[0]][args[1]] : null
        if (item) {
            let avaliable
            let releases = []
            if (item.bait == 1) {
                avaliable = false
            } else if (args[0] != 'items') {
                avaliable = true
            } else {
                avaliable = await this.handler.api.apiFunction('/getItemAvaliable', {item: args[1]})
                releases = await this.handler.api.apiFunction('/getItemReleases', {item: args[1]})
                releases = releases.map((j) => {
                    return JSON.stringify(j)
                })
            }

            user.sendXt('gii', `${args[0]}%${args[1]}%${item.name}%${item.cost}%${avaliable}%[${releases.join(',')}]`)
        }
    }

    async getCost(args, user) {
        let items = []

        if (args[1] == 'all') {
            for (let i in this.crumbs[args[0]]) {
                let item = this.crumbs[args[0]][i]
                items.push(`${i}:${item.cost}`)
            }
        } else {
            for (let i of args[1].split('|')) {
                let item = this.crumbs[args[0]][i]
                items.push(`${i}:${item.cost}`)
            }
        }

        if (items.length > 0) {
            user.sendXt('gic', `${args[0]}%${items.join('|')}`)
        }
    }
}
