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
        let waddleArray = []

        for (let waddle in user.room.waddles) {
            let users = user.room.waddles[waddle].users.map((user) => (user ? user.data.username : null))

            waddleArray.push(`${waddle}|${users.join(',')}`)
        }

        user.sendXt('gt', waddleArray.join('%'))
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
