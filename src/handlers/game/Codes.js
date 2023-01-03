import Handler from '../Handler'
import Sequelize from 'sequelize'

const Op = Sequelize.Op

export default class Codes extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'i#aci': this.addCodeItem,
            'c#gca': this.getCodeAttrs,
            'c#rc': this.reedemCode,
        }
    }

    async getCodeAttrs(args) {
        let code = await this.db.getActiveCode(args)
        user.sendXt('gca', code)
    }

    async checkCode(args) {
        let activeCodes = await this.db.getActiveCode(args)
        if (activeCodes.code === args) {
            return true
        }
        return false
    }

    async checkCodeUsage(args, user) {
        let codeId = await this.db.getActiveCode(args).id
        let usedCodes = await this.db.getUsedCodes(codeId, user)
        if (usedCodes.codeId === codeId) {
            return true
        }
        return false
    }

    async reedemCode(args, user) {
        if (!await this.checkCode(args)) {
            user.sendXt('e', `This is not a valid code.`)
        }
        if (await this.checkCodeUsage(args, user)) {
            user.sendXt('e', `You have already redeemed this code.`)
        }
        if (await this.checkCode(args) && !await this.checkCodeUsage(args, user)) {
            // add code coins
            let coins = await this.db.getActiveCode(args).coins
            await user.updateCoins(coins)
            // add code items
            let items = await this.db.getCodeItems(args)
            for (let i = 0; i < items.length; i++) {
                this.addCodeItem(items[i], user)
            }
            user.sendXt('rc', `${args}%`)
        } return
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
