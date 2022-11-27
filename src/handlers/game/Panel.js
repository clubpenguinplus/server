import Handler from '../Handler'

export default class Panel extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'o#gu': this.getUnverifedUsers,
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
        }
    }

    async getUnverifedUsers(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let users = await this.db.getUnverifedUsers()

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
                username_rejected: 0,
            },
            {
                where: {
                    id: args[0],
                },
            }
        )

        this.getUnverifedUsers(args, user)
    }

    async rejectUser(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        await this.db.users.update(
            {
                username_rejected: 1,
                username_approved: 0,
            },
            {
                where: {
                    id: args[0],
                },
            }
        )

        this.getUnverifedUsers(args, user)
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

        request.ip = null
        request.loginKey = null
        request.password = null

        let bans = await this.db.getBanCount(args[0])
        let activeban = await this.db.getActiveBan(args[0])

        if (request) {
            user.sendXt('edp', `${JSON.stringify(request)}|${bans}|${activeban}`)
        }
    }

    async addUserCoins(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let userName = (await this.db.getUserById(args[0])).username

        user.sendXt('error', {
            error: 16,
        })

        let recipient = this.usersById[args[0]]

        if (recipient) {
            await recipient.updateCoins(parseInt(args[1]))
            recipient.sendXt('eg', `${recipient.data.coins}%'Gift from a moderator!'%${args[1]}`)
            this.handler.api.apiFunction('/logTransaction', {amount: args[1], user: args[0], reason: 'moderator gift', total: recipient.data.coins})
        } else {
            await this.db.addCoins(args[0], args[1])
            let coins = (await this.db.getUserById(args[0])).data.coins
            this.handler.api.apiFunction('/logTransaction', {amount: args[1], user: args[0], reason: 'moderator gift', total: coins})
        }

        this.discord.addCoinLogs(user.data.username, userName, args[1])
    }

    async addUserItems(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }

        let userName = (await this.db.getUserById(args[0])).username

        this.discord.addItemLogs(user.data.username, userName, args[2])

        let recipient = this.usersById[args[0]]

        args[1] = parseInt(args[1])

        if (recipient) {
            let item = this.crumbs.items[args[1]]
            recipient.inventory.add(args[1])
            recipient.sendXt('ai', args[1], args[2], this.crumbs.items.slots[item.type - 1], recipient.data.coins)
            user.sendXt('e', 17)
            this.handler.api.apiFunction('/logTransaction', {amount: '0', user: args[0], reason: `moderator gift of item ${args[1]} : ${args[2]}`, total: recipient.data.coins})
        } else {
            let item = this.db.addItem(args[0], args[1])

            if (item) {
                user.sendXt('e', 17)
            }

            this.handler.api.apiFunction('/logTransaction', {amount: '0', user: args[0], reason: `moderator gift of item ${args[1]} : ${args[2]}`, total: (await this.db.getUserById(args[0])).data.coins})
        }
    }

    async banUser(args, user) {
        if (user.data.rank < 3) {
            user.sendXt('e', 15)
            return
        }
        let recipient = this.usersById[args[0]]
        let recipientRank = await this.getRecipientRank(recipient, args[0])

        if (recipientRank < user.data.rank) {
            let date = new Date()
            let expiry = date.getTime() + args[1]
            await this.db.ban(args[0], expiry, user.data.id)

            let userName = (await this.db.getUserById(args[0])).username
            let expiryDate = new Date(expiry)

            if (recipient) {
                recipient.sendXt('b', 'o')
                recipient.close()
            }

            user.sendXt('e', [18, expiryDate.toUTCString()])

            handler.api('/logBan', {moderator: user.data.username, user: args[0], reason: args[3], duration: `${args[2]}`})
            this.discord.banLogs(user.data.username, userName, args[2], expiryDate.toUTCString())
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

            this.discord.changeUsernameLogs(user.data.username, userName, args[1])
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
}
