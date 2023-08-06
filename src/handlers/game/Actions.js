import Handler from '../Handler'

export default class Actions extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'u#sp': this.sendPosition,
            'u#tsp': this.sendTeleportPosition,
            'u#sf': this.sendFrame,
            'u#sb': this.snowball,
            'st#sse': this.stampEarned,
            'st#sv': this.saveStampbook
        }
    }

    sendPosition(args, user) {
        user.x = args[0]
        user.y = args[1]
        user.frame = 1

        user.room.sendXt(user, 'sp', `${user.data.id}%${args[0]}%${args[1]}`, [])
    }

    sendTeleportPosition(args, user) {
        user.x = args[0]
        user.y = args[1]
        user.frame = 1

        user.room.sendXt(user, 'tsp', `${user.data.id}%${args[0]}%${args[1]}`, [])
    }

    sendFrame(args, user) {
        if (args[0]) {
            user.frame = args[1]
        } else {
            user.frame = 1
        }

        user.room.sendXt(user, 'sf', `${user.data.id}%${args[1]}%${args[0]}`, [])
    }

    snowball(args, user) {
        user.room.sendXt(user, 'sb', `${user.data.id}%${args[0]}%${args[1]}`, [])
    }

    async stampEarned(args, user) {
        let stampId = parseInt(args[0])
        if (user.stamps.includes(stampId)) {
            return user.sendXt('e', 4)
        }
        let stamp = await user.stamps.add(stampId)
        if (!stamp) {
            return user.sendXt('e', 5)
        }
        user.sendXt('sse', stampId)
    }

    saveStampbook(args, user) {
        user.data.stampbookColor = args[0]
        user.data.stampbookClasp = args[1]
        user.data.stampbookPattern = args[2]
        user.data.customStamps = args[3]

        user.update({
            stampbookColor: user.data.stampbookColor,
            stampbookClasp: user.data.stampbookClasp,
            stampbookPattern: user.data.stampbookPattern,
            customStamps: user.data.customStamps
        })
    }
}
