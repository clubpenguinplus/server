import Handler from '../Handler'

export default class Moderation extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'o#m': this.mutePlayer,
            'o#k': this.kickPlayer,
            'o#sm': this.stealthMode,
            'o#w': this.warnPlayer,
        }
    }

    mutePlayer(args, user) {}

    kickPlayer(args, user) {
        if (!user.isModerator) {
            return
        }

        let recipient = this.usersById[args[0]]

        if (recipient && recipient.data.rank < user.data.rank) {
            recipient.sendXt('k', 'k')
            recipient.close()
            this.discord.kickLogs(user.data.username, recipient.data.username)
            this.handler.analytics.kickUser(recipient.data.id, user.data.id, args[1])
        }
    }

    warnPlayer(args, user) {
        if (!user.isModerator) {
            return
        }

        let recipient = this.usersById[args[0]]

        if (recipient && recipient.data.rank < user.data.rank) {
            recipient.sendXt('w')
        }
        this.handler.analytics.warnUser(recipient.data.id, user.data.id, args[1])
    }

    stealthMode(args, user) {
        if (!user.isModerator) {
            return
        }

        this.db.users.update({stealthMode: args[0] ? 0 : 1}, {where: {id: user.data.id}})

        let string = args[0] ? 'disabled' : 'enabled'
        user.sendXt('e', args[0] ? 14 : 13)
    }

    async banPlayer(args, user) {
        if (!user.isModerator) {
            return
        }

        let recipient = this.usersById[args[0]]
        let recipientRank = await this.getRecipientRank(recipient, args[0])

        if (recipientRank < user.data.rank) {
            await this.applyBan(user, args[0], args[1], args[2])

            if (recipient) {
                recipient.sendXt('b', args[2])
                recipient.close()
            }
        }
    }

    async applyBan(moderator, id, hours = 24, message = '') {
        let expires = Date.now() + hours * 60 * 60 * 1000

        let banCount = await this.db.getBanCount(id)
        // 5th ban is a permanent ban
        if (banCount >= 4) {
            this.db.users.update({permaBan: true}, {where: {id: id}})
        }

        this.db.bans.create({
            userId: id,
            expires: expires,
            moderatorId: moderator.data.id,
            message: message,
        })

        let userName = (await this.db.getUserById(id)).username

        this.discord.banLogs(moderator.data.username, userName, expires)
        this.handler.analytics.banUser(id, moderator.data.id, message, hours)
    }

    async getRecipientRank(recipient, id) {
        return recipient ? recipient.data.rank : (await this.db.getUserById(id)).rank
    }
}
