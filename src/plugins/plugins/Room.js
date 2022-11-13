import Plugin from '../Plugin'

export default class Room extends Plugin {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'u#mc': this.mining,
        }
    }

    async mining(args, user) {
        let maxCoinsPerMinute = 300
        args[0] = parseInt(args[0])
        if (args[0] > 100) {
            return
        }

        user.miningCoinsThisMinute = (user.miningCoinsThisMinute || 0) + args[0]

        if (user.miningCoinsThisMinute > maxCoinsPerMinute) {
            return
        }

        await user.updateCoins(args[0])

        user.sendXt('mc', `${args[0]}%${user.data.coins}`)

        if (!user.miningCoinTimeout) {
            user.miningCoinTimeout = setTimeout(() => {
                user.miningCoinsThisMinute = 0
                user.miningCoinTimeout = null
            }, 60000)
        }
    }
}
