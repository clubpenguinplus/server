import Handler from '../Handler'

export default class Matchmaking extends Handler {
    constructor(handler) {
        super(handler)

        this.events = {
            join_matchmaking: this.joinMatchmaking,
            leave_matchmaking: this.leaveMatchmaking
        }
    }

    joinMatchmaking(args, user) {
        if (!user.room.matchmaker) {
            return
        }

        if (!user.room.matchmaker.includes(user)) {
            user.room.matchmaker.add(user)
        }
    }

    leaveMatchmaking(args, user) {
        if (!user.room.matchmaker) {
            return
        }

        if (user.room.matchmaker.includes(user)) {
            user.room.matchmaker.remove(user)
        }
    }
}
