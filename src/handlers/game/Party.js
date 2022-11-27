import Handler from '../Handler'

export default class Party extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            // 'e#pc': this.getPartyCompletion,
        }

        this.handler.partyData.party = null
    }

    // async getPartyCompletion(args, user) {
    //     let partyCompletion = await this.db.getPartyCompletion(user.data.id, args[0])
    //     if (partyCompletion) {
    //         user.sendXt('get_party_completion', partyCompletion)
    //     }
    // }
}
