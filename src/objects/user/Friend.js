export default class Friend {
    constructor(user) {
        this.user = user
        this.usersById = user.handler.usersById
        this.db = user.db

        // Friend list
        this.list = []
        // Pending requests that the user has received
        this.requests = []
    }

    get flat() {
        return this.list.map((friend) => friend.id)
    }

    async init(friends) {
        for (let friend of friends) {
            let user = await this.db.getUserById(friend[0])
            if (!user) continue
            let online = this.isOnline(user.id)

            // Online status here is only used on initial load or adding of a new friend,
            // further requests should use isOnline to stay updated.
            this.list.push({
                id: user.id,
                username: this.filterUsername(user),
                online: online,
                isBff: friend[1]
            })

            // Send online status to friend
            if (online) this.sendOnline(user.id)
        }
    }

    filterUsername(penguin) {
        if (penguin.username_approved == 1) {
            return penguin.username
        } else {
            return 'P' + penguin.id
        }
    }

    includes(friend) {
        return this.flat.includes(friend)
    }

    addRequest(id, username) {
        if (this.user.data.id == id) return
        // If user is ignored
        if (this.user.ignore.includes(id)) return
        // If friend already added
        if (this.includes(id)) return
        // If request has already been received
        if (this.requests.includes(id)) return

        this.requests.push(id)
        this.user.sendXt('rq', `${id}%${username}`)
    }

    addFriend(id, username, requester = false) {
        let online = this.isOnline(id)

        this.list.push({id: id, username: username, online: online})
        this.user.sendXt('arq', `${id}%${username}%${requester}%${online}`)
    }

    removeFriend(id) {
        // Filter friend out of list
        this.list = this.list.filter((obj) => obj.id != id)
        this.user.sendXt('rf', id)
    }

    /*========== Online status ==========*/

    isOnline(id) {
        if (this.usersById[id]) {
            return true
        }
        return false
    }

    sendOnline(id) {
        let user = this.usersById[id]

        user.sendXt('fo', this.user.string)
    }

    sendOffline() {
        for (let friend of this.list) {
            if (this.isOnline(friend.id)) {
                let user = this.usersById[friend.id]

                user.sendXt('of', this.user.data.id)
            }
        }
    }
}
