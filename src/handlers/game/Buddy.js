import Handler from '../Handler'
import Sequelize from 'sequelize'

const Op = Sequelize.Op

export default class Friend extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'b#br': this.friendRequest,
            'b#ba': this.friendAccept,
            'b#be': this.friendReject,
            'b#rb': this.friendRemove,
            'b#bf': this.friendFind,
            'b#sh': this.friendSearch,
            'b#gfo': this.friendGetOnline,
            'b#bff': this.setBFF,
        }
    }

    async friendRequest(args, user) {
        args[0] = parseInt(args[0])
        let recipient = this.usersById[args[0]]

        // Send request to recipient if they are online

        let ignores = await this.db.getIgnores(args[0])
        if (ignores.includes(user.data.id)) {
            return user.sendXt('e', 6)
        }
        let friends = await this.db.getFriends(args[0])
        if (this.userFriended(user.data.id, friends)) {
            return user.sendXt('e', 7)
        }
        let pending = await this.db.getPendingFriends(args[0])
        if (pending.includes(user.data.id)) {
            return user.sendXt('e', 8)
        }
        let pendingOther = await this.db.getPendingFriends(user.data.id)
        if (pendingOther.includes(args[0])) {
            return user.sendXt('e', 9)
        }
        await this.db.pendingBuddies.create({sender: user.data.id, recipient: args[0]})

        if (recipient) {
            recipient.sendXt('rq', `${user.data.id}%${user.data.username}`)
        }
    }

    userFriended(userId, friends) {
        for (let f of friends) {
            if (f[0] == userId) {
                return true
            }
        }
        return false
    }

    async friendAccept(args, user) {
        args[0] = parseInt(args[0])
        if (user.friend.includes(args[0])) return
        if (user.ignore.includes(args[0])) return

        let pending = await this.db.pendingBuddies.findOne({where: {sender: args[0], recipient: user.data.id}})
        if (!pending) return

        let requester = await this.db.getUserById(args[0])
        if (!requester) return

        // Add to recipient friend list
        user.friend.addFriend(args[0], requester.dataValues.username)

        // Add to requester friend list
        if (this.usersById[requester.dataValues.id]) {
            this.usersById[requester.dataValues.id].friend.addFriend(user.data.id, user.data.username, true)
        }

        // Db queries
        this.db.buddies.create({userId: user.data.id, buddyId: args[0]})
        this.db.buddies.create({userId: args[0], buddyId: user.data.id})
        this.db.pendingBuddies.destroy({where: {sender: args[0], recipient: user.data.id}})
    }

    friendReject(args, user) {
        // Remove request
        user.friend.requests = user.friend.requests.filter((item) => item != args[0])
        this.db.pendingBuddies.destroy({where: {sender: args[0], recipient: user.data.id}})
    }

    friendRemove(args, user) {
        args[0] = parseInt(args[0])

        if (!user.friend.includes(args[0])) return

        user.friend.removeFriend(args[0])

        let friend = this.usersById[args[0]]
        if (friend) friend.friend.removeFriend(user.data.id)

        this.db.buddies.destroy({where: {userId: user.data.id, buddyId: args[0]}})
        this.db.buddies.destroy({where: {userId: args[0], buddyId: user.data.id}})
    }

    friendFind(args, user) {
        args[0] = parseInt(args[0])
        if (!(user.friend.includes(args[0]) || user.data.rank > 2) || !(args[0] in this.usersById)) {
            return
        }

        let friend = this.usersById[args[0]]

        if (!friend.room) {
            return
        }

        let result = friend.room.id

        if (friend.room.isIgloo) {
            result = 'igloo'
        } else if (friend.room.game) {
            result = 'game'
        }

        user.sendXt('bf', result)
    }

    async friendSearch(args, user) {
        args[0] = args[0].trim().toLowerCase()
        if (args[0][0] == 'p' && /^[0-9]+$/.test(args[0].substring(1))) args[0] = args[0].substring(1)
        if (!args[0] || args[0].length === 0) {
            return
        }

        let exact = await this.db.users.findOne({
            where: {username: args[0], username_approved: 1},
            attributes: ['id', 'username'],
        })

        let exactUnverified = await this.db.users.findOne({
            where: {id: args[0], username_approved: 0},
            attributes: ['id'],
        })

        let friend
        if (exact) {
            friend = exact
        } else if (exactUnverified) {
            friend = exactUnverified
            friend.username = `P${friend.id}`
        }

        if (friend) {
            if (friend.id == user.data.id) {
                return user.sendXt('fse', 23)
            } else if (user.friend.flat.includes(friend.id)) {
                return user.sendXt('fse', 24)
            } else if (user.ignore.flat.includes(friend.id)) {
                return user.sendXt('fse', 25)
            } else if (friend.id < 1000) {
                return user.sendXt('fse', 22)
            }
            user.sendXt('fs', `${friend.id}|${friend.username}`)
        } else {
            user.sendXt('fse', 20)
        }
    }

    async friendGetOnline(args, user) {
        args[0] = parseInt(args[0])
        if (this.handler.usersById[args[0]]) {
            user.sendXt('fo', this.handler.usersById[args[0]].string)
        }
    }

    async setBFF(args, user) {
        for (let f of user.friend.list) {
            if (f.id == args[0]) {
                f.isBff = true
                await this.db.buddies.update({isBff: parseInt(args[1])}, {where: {userId: user.data.id, buddyId: args[0]}})
                return
            }
        }
    }
}
