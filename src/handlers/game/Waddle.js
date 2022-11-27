import Handler from '../Handler'

export default class Waddle extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'a#gt': this.getWaddles,
            'a#jt': this.joinWaddle,
            'a#lt': this.leaveWaddle,
        }
    }

    getWaddles(args, user) {
        let waddles = Object.values(user.room.waddles)
            .map((waddle) => {
                let users = waddle.users.map((user) => (user ? user.data.username : null))

                return `${waddle.id}|${users.join(',')}`
            })
            .join('%')

        user.sendXt('gt', waddles)
    }

    joinWaddle(args, user) {
        let waddle = user.room.waddles[args[0]]

        if (waddle && waddle.users.includes(null) && !user.waddle) {
            waddle.add(user)
        }
    }

    leaveWaddle(args, user) {
        if (user.waddle) {
            user.waddle.remove(user)
        }
    }
}
