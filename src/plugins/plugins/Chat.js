import Plugin from '../Plugin'

export default class Chat extends Plugin {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'm#sm': this.sendMessage,
            'u#sf': this.sendSafe,
            'u#se': this.sendEmote,
        }

        this.commands = {
            users: this.userPopulation,
            broadcast: this.broadcast,
        }

        this.bindCommands()
    }

    // Events

    sendMessage(args, user) {
        // Todo: message validation
        if (args[0].startsWith('!')) {
            return this.processCommand(args[0], user)
        }
        this.processMessage(args[0], user)
    }

    processMessage(message, user) {
        if (message.length < 1 || message.length > 100) {
            return
        }

        // moderators bypass the filter
        let whitelist = user.data.rank > 3 ? false : this.handler.filter.checkWhitelistFilter(message)

        let blacklist = this.handler.filter.checkBlacklistFilter(message)

        if (!whitelist && !blacklist) {
            user.room.sendXt(user, 'sm', `${user.data.id}%${message}`, [], true)
            user.logChat(message)
        } else if (!whitelist && blacklist) {
            user.room.sendXt(user, 'fm', `${user.data.id}%${message}`, [], true)
            user.logChat(message, true, `blacklist filter because of ${blacklist}`)

            if (user.sesWarns >= 2) {
                return this.chatBan(user, blacklist)
            }

            // warning prompt
            user.sendXt('w', 'c')
            user.sesWarns++
        } else {
            user.room.sendXt(user, 'fm', `${user.data.id}%${message}`, [], true)
            user.logChat(message, true, `whitelist filter because of ${whitelist}`)
        }
    }

    sendSafe(args, user) {
        user.room.sendXt(user, 'ss', `${user.data.id}%${args[0]}`, [], true)
    }

    sendEmote(args, user) {
        user.room.sendXt(user, 'se', `${user.data.id}%${args[0]}`, [], true)
    }

    async chatBan(user, reason) {
        let date = new Date()
        let banCount = await this.db.getBanCount(user.data.id)
        let time = 24

        if (banCount == 0) {
            time = 24
        } else if (banCount == 1) {
            time = 72
        } else if (banCount == 2) {
            time = 168
        } else if (banCount == 3) {
            time = 672
        } else if (banCount == 4) {
            time = 2160
        } else if (banCount > 4) {
            await this.db.users.update({permaBan: true}, {where: {id: user.data.id}})
            user.sendXt('b', 'o')
            user.close()
            return
        }

        let expiry = date.getTime() + time * 60 * 60 * 1000

        await this.db.ban(user.data.id, expiry, null, `blacklist: ${reason}`)
        user.sendXt('b', 'c,' + time)
        user.close()
    }

    // Commands

    bindCommands() {
        for (let command in this.commands) {
            this.commands[command] = this.commands[command].bind(this)
        }
    }

    processCommand(message, user) {
        let msg = message.substring(1)
        let args = msg.split(' ')
        let command = args.shift()

        if (command in this.commands) {
            user.room.send(
                user,
                'filtered_message',
                {
                    id: user.data.id,
                    message: message,
                    filter: 'manual',
                },
                [user],
                true
            )
            return this.commands[command](args, user)
        }
        this.processMessage(message, user)
    }

    userPopulation(args, user) {
        if (user.data.rank < 3) return
        user.sendXt('e', [10, this.handler.population])
    }

    broadcast(args, user) {
        if (user.data.rank < 5) return
        this.handler.broadcast(args.join(' '))
    }
}
