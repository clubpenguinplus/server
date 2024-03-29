export default class Handler {
    constructor(handler) {
        this.handler = handler

        this.db = handler.db
        this.users = handler.users
        this.usersById = handler.usersById
        this.usersBySessionId = handler.usersBySessionId
        this.crumbs = handler.crumbs
        this.rooms = handler.rooms
        this.openIgloos = handler.openIgloos
    }
}
