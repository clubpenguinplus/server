import Handler from '../Handler'

export default class Party extends Handler {
    constructor(handler) {
        super(handler)

        this.events = {
            'p#cfc': this.getCfcContributions,
            'p#donate': this.donateCoins
        }
    }

    getCfcContributions(args, user) {
        let contributions = user.data.cfcDonations
        user.sendXt('cfc', contributions)

        user.sendXt('cfct', this.handler.partyData.cfcTotal)
    }

    donateCoins(args, user) {
        let coins = parseInt(args[0])
        if (isNaN(coins)) {
            return
        }

        if (coins > user.data.coins) {
            return user.sendXt('e', 0)
        }

        user.donateCoins(coins)

        user.sendXt('ac', user.data.coins)
        user.sendXt('cfc', user.data.cfcDonations)
        user.sendXt('cfct', this.handler.partyData.cfcTotal)
    }
}
