export default class Room {
    constructor(data, handler) {
        Object.assign(this, data)

        this.users = {}

        this.handler = handler

        // Only used by rooms with waddles
        this.waddles = {}

        this.wiretapMods = []
    }

    get userValues() {
        return Object.values(this.users)
    }

    get strings() {
        return this.userValues.map((user) => user.string)
    }

    get isFull() {
        return Object.keys(this.users).length >= this.maxUsers
    }

    add(user) {
        if (this.users[user.data.id]) this.remove(user)
        this.users[user.data.id] = user

        if (this.game) {
            return user.sendXt('jg', this.id)
        }

        user.sendXt('jr', `${this.id}%${this.strings.join()}`)
        this.sendXt(user, 'ap', user.string)
    }

    remove(user) {
        if (!this.game) {
            this.sendXt(user, 'rp', user.data.id)
        }

        delete this.users[user.data.id]
    }

    /**
     * Sends a packet to all users in the room, by default the client is excluded.
     *
     * @param {User} user - Client User object
     * @param {string} action - Packet name
     * @param {object} args - Packet arguments
     * @param {Array} filter - Users to exclude
     * @param {boolean} checkIgnore - Whether or not to exclude users who have user added to their ignore list
     */
    sendXt(user, action, args = {}, filter = [user], checkIgnore = false) {
        let users = this.userValues.filter((u) => !filter.includes(u))

        for (let u of users) {
            if (checkIgnore && u.ignore.includes(user.data.id)) continue

            u.sendXt(action, args)
        }

        if (action == 'send_message') {
            for (let w of this.wiretapMods) {
                if (this.handler.modsOnPanel[w]) this.handler.modsOnPanel[w].sendXt('owt', `${user.data.id}%${args}%${this.id}%${user.data.username}`)
            }
        } else if (action == 'filtered_message') {
            for (let w of this.wiretapMods) {
                if (this.handler.modsOnPanel[w]) this.handler.modsOnPanel[w].sendXt('owf', `${user.data.id}%${args}%${this.id}%${user.data.username}`)
            }
        }
    }
}
