import Plugin from '../Plugin'

export default class Actions extends Plugin {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'u#sp': this.sendPosition,
            'u#sf': this.sendFrame,
            'u#sb': this.snowball,
            'st#sse': this.stampEarned,
            'st#sv': this.saveStampbook,
        }
    }

    sendPosition(args, user) {
        user.x = args[0]
        user.y = args[1]
        user.frame = 1

        user.room.sendXt(user, 'sp', `${user.data.id}%${args[0]}%${args[1]}`, [])
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
        user.data.stampbookColor = args.color
        user.data.stampbookClasp = args.clasp
        user.data.stampbookPattern = args.pattern

        user.update({
            stampbookColor: user.data.stampbookColor,
            stampbookClasp: user.data.stampbookClasp,
            stampbookPattern: user.data.stampbookPattern,
        })
    }
}
