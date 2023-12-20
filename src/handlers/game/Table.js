import Handler from '../Handler'

import {isNumber} from '../../utils/validation'

export default class Table extends Handler {
    constructor(handler) {
        super(handler)

        this.events = {
            get_tables: this.getTables,
            join_table: this.joinTable,
            leave_table: this.leaveTable,
            get_game: this.getGame,
            join_game: this.joinGame
        }
    }

    getTables(args, user) {
        let tables = Object.fromEntries(
            Object.values(user.room.tables).map((table) => {
                let users = table.users.map((user) => user.username)

                return [table.id, users]
            })
        )

        user.sendXt('get_tables', JSON.stringify({tables: tables}))
    }

    joinTable(args, user) {
        args = {table: parseInt(args[0])}
        if (!isNumber(args.table)) {
            return
        }

        let table = user.room.tables[args.table]

        user.joinTable(table)
    }

    leaveTable(args, user) {
        if (user.minigameRoom) {
            user.minigameRoom.remove(user)
        }
    }

    getGame(args, user) {
        if (!user.minigameRoom) {
            return
        }

        user.minigameRoom.getGame(args, user)
    }

    joinGame(args, user) {
        if (!user.minigameRoom) {
            return
        }

        user.minigameRoom.joinGame(args, user)
    }
}
