import Plugin from '../Plugin'

export default class Ignore extends Plugin {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'n#an': this.addIgnore,
            'n#rn': this.removeIgnore,
        }
    }

    addIgnore(args, user) {
        if (user.data.id == args[0]) return
        if (user.friend.includes(args[0])) return
        if (user.ignore.includes(args[0])) return

        // Remove any existing requests
        user.friend.requests = user.friend.requests.filter((item) => item != args[0])

        let ignore = this.usersById[args[0]]
        if (ignore) {
            ignore.friend.requests = ignore.friend.requests.filter((item) => item != user.data.id)
        }

        // Add to ignore list
        user.ignore.addIgnore(args[0], args[1])

        // Db queries
        this.db.ignores.create({userId: user.data.id, ignoreId: args[0]})
    }

    removeIgnore(args, user) {
        if (!user.ignore.includes(args[0])) return

        user.ignore.removeIgnore(args[0])

        this.db.ignores.destroy({
            where: {userId: user.data.id, ignoreId: args[0]},
        })
    }
}
