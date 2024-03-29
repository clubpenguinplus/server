import Handler from '../Handler'

export default class Panel extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'o#gu': this.getUnverifiedUsers,
            'o#vp': this.verifyUser,
            'o#vj': this.rejectUser,
            'o#se': this.getUserInfo,
            'o#gp': this.editPlayer,
            'o#ac': this.addUserCoins,
            'o#ai': this.addUserItems,
            'o#b': this.banUser,
            'o#cn': this.changeUsername,
            'o#wt': this.wireTap,
            'o#tw': this.unWireTap,
            'i#sa': this.setItemAvailable
        }
    }

    async getUnverifiedUsers(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let users = await this.db.getUnverifiedUsers()

        let small = []
        for (let i = 0; i < users.length; i++) {
            let user = users[i]
            small.push(`${user.id}|${user.username}`)
        }

        if (users) {
            user.sendXt('gvu', small.join())
        }
    }

    async verifyUser(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        await this.db.users.update(
            {
                username_approved: 1,
                username_rejected: 0
            },
            {
                where: {
                    id: args[0]
                }
            }
        )

        this.getUnverifiedUsers(args, user)
    }

    async rejectUser(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        await this.db.users.update(
            {
                username_rejected: 1,
                username_approved: 0
            },
            {
                where: {
                    id: args[0]
                }
            }
        )

        this.getUnverifiedUsers(args, user)
    }

    async getUserInfo(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let users = await this.db.searchForUsers(args[0])

        let small = []
        for (let i = 0; i < users.length; i++) {
            let user = users[i]
            small.push(`${user.id}|${user.username}`)
        }

        if (users) {
            user.sendXt('gvu', small.join())
        }
    }

    async editPlayer(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let request = await this.db.getUserById(args[0])

        if (!request) return

        let bans = await this.db.getBanCount(args[0])
        let activeban = request.permaBan ? -1 : await this.db.getActiveBan(args[0])

        request = `${request.id}|${request.username}|${request.color}|${request.head}|${request.face}|${request.neck}|${request.body}|${request.hand}|${request.feet}|${request.flag}|${request.photo}|${request.coins}|${this.x}|${this.y}|${this.frame}|${request.rank}|${request.stealthMode ? 1 : 0}|${request.username_approved ? 1 : 0}|${request.username_rejected ? 1 : 0}|${request.walking}|${request.epfStatus}|${new Date(request.joinTime).getTime()}`

        user.sendXt('edp', `${request}%${bans}%${activeban}`)
    }

    async addUserCoins(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let userName = (await this.db.getUserById(args[0])).username

        user.sendXt('error', {
            error: 16
        })

        let recipient = this.usersById[args[0]]

        if (recipient) {
            await recipient.updateCoins(parseInt(args[1]))
            recipient.sendXt('eg', `${recipient.data.coins}%'Gift from a moderator!'%${args[1]}`)
            this.handler.analytics.transaction(args[0], args[1], 'moderator gift')
        } else {
            await this.db.addCoins(args[0], args[1])
            this.handler.analytics.transaction(args[0], args[1], 'moderator gift')
        }
    }

    async addUserItems(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let userName = (await this.db.getUserById(args[0])).username

        let recipient = this.usersById[args[0]]

        args[1] = parseInt(args[1])

        if (recipient) {
            let item = this.crumbs.items[args[1]]
            recipient.inventory.add(args[1])
            recipient.sendXt('ai', args[1], args[2], this.crumbs.items.slots[item.type - 1], recipient.data.coins)
            user.sendXt('e', 17)
            this.handler.analytics.transaction(args[0], 0, `moderator gift of item ${args[1]} : ${args[2]}`)
        } else {
            let item = this.db.addItem(args[0], args[1])

            if (item) {
                user.sendXt('e', 17)
            }

            this.handler.analytics.transaction(args[0], 0, `moderator gift of item ${args[1]} : ${args[2]}`)
        }
    }

    async banUser(args, user) {
        args[0] = parseInt(args[0])
        if (args[1] == 'p') {
            args[1] = 87600
        } else {
            args[1] = parseInt(args[1])
        }
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }
        let recipient = this.usersById[args[0]]
        let recipientRank = await this.getRecipientRank(recipient, args[0])

        if (recipientRank < user.data.rank) {
            let date = new Date()
            let expiry = date.getTime() + args[1] * 60 * 60 * 1000
            await this.db.ban(args[0], expiry, user.data.id, args[3])

            let userName = (await this.db.getUserById(args[0])).username
            let expiryDate = new Date(expiry)

            if (recipient) {
                recipient.sendXt('b', `${args[2]}%${args[1]}`)
                recipient.close()
            }

            user.sendXt('e', [18, expiryDate.toUTCString().replaceAll(',', '')])

            this.handler.analytics.banUser(args[0], user.data.id, args[3], args[1])
        } else {
            user.sendXt('e', 15)
        }
    }

    async changeUsername(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let userName = (await this.db.getUserById(args[0])).username

        let complete = await this.db.changeUsername(args[0], args[1])

        if (complete) {
            user.sendXt('e', 19)
        }
    }

    async getRecipientRank(recipient, id) {
        return recipient ? recipient.data.rank : (await this.db.getUserById(id)).rank
    }

    async wireTap(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let room = args[0]

        if (room == 'all') {
            for (let i in this.rooms) {
                if (this.rooms[i].wiretapMods.includes(user.data.id)) continue
                this.rooms[i].wiretapMods.push(user.data.id)
            }
        } else {
            if (!this.rooms[room]) return
            if (this.rooms[room].wiretapMods.includes(user.data.id)) return
            this.rooms[room].wiretapMods.push(user.data.id)
        }
    }

    async unWireTap(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let room = args[0]

        if (room == 'all') {
            for (let i in this.rooms) {
                this.rooms[i].wiretapMods = this.rooms[i].wiretapMods.filter((mod) => mod != user.data.id)
            }
        } else {
            if (!this.rooms[room]) return
            this.rooms[room].wiretapMods = this.rooms[room].wiretapMods.filter((mod) => mod != user.data.id)
        }
    }

    async setItemAvailable(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let item = this.crumbs.items[args[0]]
        if (!item) return

        this.handler.analytics.setItemAvailability(args[0], parseInt(args[1]))
    }
}
