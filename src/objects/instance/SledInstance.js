import WaddleInstance from './WaddleInstance'

export default class SledInstance extends WaddleInstance {
    constructor(waddle) {
        super(waddle)

        this.id = 999

        this.payouts = [20, 10, 5, 5]
    }

    // Events

    sendMove(args, user) {
        this.sendXt('ssm', args.join('%'), user)
    }

    // Functions

    gameReady() {
        let users = this.users.filter(Boolean).map((user) => {
            return {
                username: user.data.username,
                color: user.data.color,
                hand: user.data.hand
            }
        })

        for (let user of this.users) {
            if (!user) return this.handler.log.error('User not found')
            user.sledrace = this
        }

        this.userInfo = users

        this.sendXt(
            'sg',
            `${users.length}%${users
                .map((user) => {
                    return `${user.username}|${user.color}|${user.hand}`
                })
                .join('%')}`
        )

        super.gameReady()
    }

    setFinished(username, coins) {
        var allFinished = true
        for (var user of this.userInfo) {
            if (user.username == username) {
                user.finished = true
                user.coins = coins
            }
            if (!user.finished) {
                allFinished = false
            }
        }
        if (allFinished) {
            for (var user of this.users) {
                let coins = this.getUserCoins(user.data.username)
                user.updateCoins(coins)
                user.sendXt('eg', `${user.data.coins}%sled%${coins}`)
                super.remove(user)
            }
        }
    }

    getUserCoins(username) {
        for (var user of this.userInfo) {
            if (user.username == username) {
                return user.coins
            }
        }
    }
}
