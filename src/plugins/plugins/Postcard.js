import Plugin from '../Plugin'

export default class Postcard extends Plugin {
    constructor(network) {
        super(network)
        this.events = {
            'l#md': this.updatePostcards,
            'l#ms': this.sendPostcard,
        }
    }

    async updatePostcards(args, user) {
        await user.db.userPostcards.destroy({where: {userId: user.data.id}})
        for (let postcard of args[0]) {
            await user.db.userPostcards.create({
                userId: user.data.id,
                id: postcard.id,
                sender: postcard.sender,
                time_sent: postcard.time_sent,
            })
        }
    }

    async sendPostcard(args, user) {
        let recipientUser = await user.db.getUserByUsername(args[1])
        let recipientId
        if (recipientUser) {
            recipientId = recipientUser.dataValues.id
        } else {
            return user.sendXt('e', 20)
        }
        let recipientPostcards = await user.db.getPostcards(recipientId)
        if (recipientPostcards.length >= 100) {
            return user.sendXt('e', 21)
        }
        if (user.data.coins < 10) return user.sendXt('e', 0)
        user.updateCoins(-10)
        await user.db.userPostcards.create({
            userId: recipientId,
            id: args[0],
            sender: user.data.username,
        })
        let recipient = this.usersById[recipientId]
        if (recipient) {
            recipient.postcards = await recipient.db.getPostcards(recipient.data.id)
            let postcards = recipient.postcards.map((postcard) => {
                return `${postcard.id}|${postcard.sender}|${postcard.details}`
            })
            recipient.sendXt('up', postcards.join())
        }
        user.sendXt('sp', user.data.coins)
    }
}
