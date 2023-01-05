import Handler from '../Handler'
import Sequelize from 'sequelize'

const Op = Sequelize.Op

export default class Codes extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'i#aci': this.addCodeItem,
            'c#gca': this.getCodeAttrs,
            'c#gci': this.getCodeItems,
            'c#rc': this.reedemCode,
        }
    }

    async getCodeAttrs(args, user) {
        let code = await this.db.getActiveCode(args)
        console.log(code)
        console.log("Server ID", code.id)
        user.sendXt('gca', `${code.id}%${code.code}%${code.coins}`)
    }

    async getCodeItems(args, user) {
        let codeId = await this.db.getActiveCode(args)
        let items = await this.db.getCodeItems(codeId?.id)
        let itemsList = []
        for (let i = 0; i < items.length; i++) {
            let item = items[i]
            itemsList.push(`${item.itemId}`)
        }

        if (items) {
            user.sendXt('gci', itemsList.join())
        }
    }

    async checkCode(args, user) {
        let activeCodes = await this.db.getActiveCode(args)
        console.log("Active Codes", activeCodes)
        console.log("Boolean Check", activeCodes?.code, args[0])
        if (activeCodes?.code === args[0]) {
            return true
        }
        return false
    }

    async checkCodeUsage(args, user) {
        let codeId = await this.db.getActiveCode(args)
        let usedCodes = await this.db.getUsedCodes(codeId?.id, user)
        console.log("Used Codes", usedCodes)
        if (usedCodes?.codeId === codeId.id) {
            return true
        }
        return false
    }

    async reedemCode(args, user) {
        console.log("Redeem args", args)
        if (!(await this.checkCode(args))) {
            user.sendXt('e', `This is not a valid code.`)
        }
        if (await this.checkCodeUsage(args, user)) {
            user.sendXt('e', `You have already redeemed this code.`)
        }
        if ((await this.checkCode(args)) && !(await this.checkCodeUsage(args, user))) {
            // add code coins
            let codeAttrs = await this.db.getActiveCode(args)
            let coins = codeAttrs.coins
            await user.updateCoins(coins)
            // add code items
            let items = await this.db.getCodeItems(args)
            for (let i = 0; i < items.length; i++) {
                this.addCodeItem(items[i], user)
            }
            this.db.usedCodes.create({codeId: codeAttrs.id, userId: user.data.id})
        }
        return
    }

    async addCodeItem(args, user) {
        args[0] = parseInt(args[0])

        let item = await user.validatePurchase.item(args[0])
        if (!item) {
            return
        }

        let slot = this.items.slots[item.type - 1]
        user.inventory.add(args[0])

        user.sendXt('aci', `${args[0]}%${item.name}%${slot}%`)
        this.handler.api.apiFunction('/logTransaction', {amount: 0, user: user.data.id, reason: `code redemption for item ${args[0]} : ${item.name}`, total: 0})
    }
}
