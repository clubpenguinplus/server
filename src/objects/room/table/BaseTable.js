export default class BaseTable {
    constructor(table, room) {
        Object.assign(this, table)

        this.room = room

        this.init()
    }

    init() {
        this.users = []
        this.started = false
        this.currentTurn = 1
    }

    get playingUsers() {
        return this.users.slice(0, 2).map((user) => user.data.username)
    }

    isPlayingUser(user) {
        return this.playingUsers.includes(user.data.username)
    }

    getGame(args, user) {
        user.sendXt('get_game', JSON.stringify(this))
    }

    joinGame(args, user) {
        if (this.started) {
            return
        }

        let turn = this.users.indexOf(user) + 1

        user.sendXt('join_game', JSON.stringify({turn}))
        this.send('update_game', JSON.stringify({username: user.data.username, turn: turn}))

        if (this.users.length == 2) {
            this.started = true
            this.send('start_game')
        }
    }

    add(user) {
        this.users.push(user)

        let seat = this.users.length

        user.sendXt('join_table', JSON.stringify({table: this.id, seat: seat, game: this.game}))
        user.room.sendXt(user, 'update_table', JSON.stringify({table: this.id, seat: seat}), [])
    }

    remove(user) {
        if (this.started && this.isPlayingUser(user)) {
            this.reset(user.data.username)
        } else {
            this.users = this.users.filter((u) => u != user)

            user.minigameRoom = null
            user.room.sendXt(user, 'update_table', JSON.stringify({table: this.id, seat: this.users.length}, []))
        }
    }

    reset(quittingUser = null) {
        for (let user of this.users) {
            user.minigameRoom = null
        }

        if (quittingUser) {
            this.send('close_game', JSON.stringify({username: quittingUser}))
        } else {
            this.send('close_game', JSON.stringify({gameOver: true}))
        }

        this.init()
        this.room.sendXt(null, 'update_table', JSON.stringify({table: this.id, seat: this.users.length}))
    }

    send(action, args = {}) {
        if (typeof args == 'object') args = JSON.stringify(args)
        for (let user of this.users) {
            user.sendXt(action, args)
        }
    }

    toJSON() {
        return {
            users: this.playingUsers,
            map: this.map
        }
    }
}
