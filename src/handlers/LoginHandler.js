import Email from '../integration/Email'
import BaseHandler from './BaseHandler'

const jsdom = require('jsdom')

/**
 * Dedicated login server handler that validates user credentials.
 */
export default class LoginHandler extends BaseHandler {
    constructor(id, users, db, log) {
        super(id, users, db, log)
        this.email = new Email(this)

        this.dir = `${__dirname}/login`

        this.crumbs = {
            worlds: this.getCrumb('worlds'),
        }

        this.loadHandlers()

        this.log.info(`[${this.id}] Created LoginHandler for server: ${this.id}`)
    }

    handle(message, user) {
        let xml = new jsdom.JSDOM(message)
        xml = xml.window.document
        this.events.emit(xml.getElementsByTagName('body')[0].getAttribute('action'), xml, user)
    }

    close(user) {
        delete this.users[user.socket.id]
    }
}
