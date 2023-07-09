import Handler from '../Handler'

export default class EPF extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'epf#j': this.join,
            'epf#gc': this.getChallenges
        }
    }

    join(args, user) {
        if (user.data.epfStatus == 0) {
            user.data.epfStatus = 1
            user.update({epfStatus: 1})
        }
    }

    async getChallenges(args, user) {
        await this.db.assignGlobalChallenges(user.data.id)
        let challenges = await this.db.getUserChallenges(user.data.id)
        let globalChallenges = await this.db.getUserGlobalChallenges(user.data.id)
        challenges = challenges.map((challenge) => {
            return `${challenge.challenge_id}:${challenge.complete}:${challenge.completion}`
        })
        globalChallenges = globalChallenges.map((challenge) => {
            return `${challenge.challenge_id}:${challenge.complete}:${challenge.completion}`
        })
        user.sendXt('epfgc', `${challenges.join('|')}%${globalChallenges.join('|')}`)
    }
}
