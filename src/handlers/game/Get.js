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
        }
    }

    getString(user) {
        return `${user.dataValues.id}|${user.dataValues.username}|${user.dataValues.color}|${user.dataValues.head}|${user.dataValues.face}|${user.dataValues.neck}|${user.dataValues.body}|${user.dataValues.hand}|${user.dataValues.feet}|${user.dataValues.flag}|${user.dataValues.photo}|${user.dataValues.coins}||||${user.dataValues.rank}|${user.dataValues.stealthMode ? 1 : 0}|${user.dataValues.username_approved ? 1 : 0}|${user.dataValues.walking}|${user.dataValues.epfStatus}`
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
        let mascots = await this.db.getMascots()
        let marray = []
        for (let i = 0; i < mascots.length; i++) {
            marray.push(`${mascots[i].id}|${mascots[i].name}|${mascots[i].giveaway}|${mascots[i].stamp}`)
        }
        user.sendXt('gm', marray.join())
    }

    async getOnline(args, user) {
        if (this.usersById[parseInt(args[0])]) {
            user.sendXt('on', args[0])
        }
    }
}
