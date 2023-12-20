export default class MatchmakerPlayer {
    constructor(user, tick) {
        this.user = user
        this.tick = tick
    }

    send(action, args = {}) {
        if (typeof args == 'object') args = JSON.stringify(args)
        this.user.sendXt(action, args)
    }
}
