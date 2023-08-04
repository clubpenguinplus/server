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
            'c#rc': this.reedemCode
        }
        this.items = this.crumbs.items
    }

    async getCodeAttrs(args, user) {
        let code = await this.db.getActiveCode(args[0])
        user.sendXt('gca', `${code.id}%${code.code}%${code.coins}`)
    }

    async getCodeItems(args, user) {
        let codeId = await this.db.getActiveCode(args[0])
        let items = await this.db.getCodeItems(codeId?.id)
        let itemsList = []
        for (let i = 0; i < items.length; i++) {
            let item = items[i]
            itemsList.push(`${item.itemId}`)
        }

        if (items) {
            user.sendXt('gci', itemsList.join())
            return itemsList
        }
    }

    async checkCode(args, user) {
        let activeCodes = await this.db.getActiveCode(args[0])
        this.handler.log.info(activeCodes)
        if (activeCodes) {
            if (activeCodes?.code === args[0]) {
                return true
            }
        } else {
            return false
        }
        return false
    }

    async checkCodeUsage(args, user) {
        let codeId = await this.db.getActiveCode(args[0])
        let usedCodes = await this.db.getUsedCodes(codeId?.id, user.data.id)
        if (usedCodes?.codeId === codeId.id) {
            return true
        }
        return false
    }

    async reedemCode(args, user) {
        this.handler.log.info('Reedem Args', args)
        if (!(await this.checkCode(args[0]))) {
            return user.sendXt('e', 50)
        }
        if (await this.checkCodeUsage(args[0], user)) {
            return user.sendXt('e', 51)
        }
        if ((await this.checkCode(args[0])) && !(await this.checkCodeUsage(args[0], user))) {
            // add code coins
            let codeAttrs = await this.db.getActiveCode(args[0])
            let coins = codeAttrs.coins
            await user.updateCoins(coins)
            // add code items
            let items = await this.getCodeItems(args[0], user)
            for (let i = 0; i < items.length; i++) {
                await this.addCodeItem(items[i], user)
            }
            await this.db.usedCodes.create({codeId: codeAttrs.id, userId: user.data.id})
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
        try {
            this.db.inventories.create({userId: user.data.id, itemId: args[0]})
        } catch (error) {
            this.handler.log.error(error)
        }

        // user.sendXt('aci', `${args[0]}%${item.name}%${slot}%`)
        this.handler.analytics.transaction(user.data.id, 0, `code redemption for item ${args[0]} : ${item.name}`)
    }
}
