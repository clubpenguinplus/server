import Api from '../integration/Api'
import Email from '../integration/Email'

import fs from 'fs'
import path from 'path'
const jsdom = require('jsdom')

/**
 * Dedicated login server handler that validates user credentials.
 */
export default class LoginHandler {
    constructor(id, users, db, log) {
        this.id = id
        this.users = users
        this.db = db
        this.log = log

        this.api = new Api(this)
        this.email = new Email(this)

        this.events = {}
        this.handlers = {}
        this.dir = `${__dirname}/login`

        this.loadHandlers()

        this.log.info(`[LoginHandler] Created LoginHandler for server: ${this.id}`)
    }

    loadHandlers() {
        fs.readdirSync(this.dir).forEach((handler) => {
            let handlerImport = require(path.join(this.dir, handler)).default
            let handlerObject = new handlerImport(this)

            this.handlers[handler.replace('.js', '').toLowerCase()] = handlerObject

            this.loadEvents(handlerObject)
        })
    }

    loadEvents(handler) {
        for (let event in handler.events) {
            this.events[event] = handler.events[event].bind(handler)
        }
    }

    handle(message, user) {
        let xml = new jsdom.JSDOM(message)
        xml = xml.window.document
        this.getEvent(xml.getElementsByTagName('body')[0].getAttribute('action'), xml, user)
    }

    // Events

    getEvent(event, xmlData, user) {
        try {
            this.events[event](xmlData, user)
        } catch (error) {
            this.log.error(`[LoginHandler] Event (${event}) not handled: ${error}`)
        }
    }

    close(user) {
        delete this.users[user.socket.id]
    }
}
