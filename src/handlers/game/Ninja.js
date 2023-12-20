import Handler from '../Handler'

export default class Sensei extends Handler {
    constructor(handler) {
        super(handler)

        this.events = {
            get_ninja: this.getNinja
        }
    }

    getNinja(args, user) {
        user.sendXt('get_ninja', {rank: user.ninjaRank, progress: user.ninjaProgress, cards: user.cards})
    }
}
