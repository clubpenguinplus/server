import Email from '../integration/Email'
import Analytics from '../integration/Analytics'

import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
const jsdom = require('jsdom')

/**
 * Dedicated login server handler that validates user credentials.
 */
export default class LoginHandler {
    constructor(id, users, db, log) {
        this.id = id
        this.users = users
        this.db = db
        db.handler = this
        this.log = log

        this.analytics = new Analytics(this)
        this.email = new Email(this)

        this.events = {}
        this.handlers = {}
        this.dir = `${__dirname}/login`

        this.crumbs = {
            worlds: this.getCrumb('worlds'),
        }

        this.loadHandlers()

        this.log.info(`[LoginHandler] Created LoginHandler for server: ${this.id}`)
    }

    getCrumb(type) {
        const data = fs.readFileSync(`./crumbs/${type}.json`)
        return JSON.parse(data)
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
            this.log.error(`[LoginHandler] Event (${event}) not handled: ${error.stack}`)
        }
    }

    close(user) {
        delete this.users[user.socket.id]
    }

    async getServerPopulations() {
        let environments = Object.keys(this.crumbs.worlds)
        let string = ''
        let currentEnvironment = 0
        await processEnvironment(environments[currentEnvironment])
        async function processEnvironment(env) {
            string += `${env}:\n`
            let worlds = Object.keys(this.crumbs.worlds[env])
            let currentWorld = 0
            await processWorld(worlds[currentWorld])
            async function processWorld(world) {
                let popData = JSON.parse(
                    await (
                        await fetch(this.crumbs.worlds[env][world].address + '/getpopulation', {
                            method: 'POST',
                        })
                    ).text()
                )
                string += `    -${world}: ${popData.population}/${popData.maxUsers}`
                currentWorld++
                if (currentWorld < worlds.length) {
                    string += '\n'
                    await processWorld(worlds[currentWorld])
                }
            }
            currentEnvironment++
            if (currentEnvironment < environments.length) {
                string += '\n\n'
                await processEnvironment(environments[currentEnvironment])
            }
        }
        return string
    }
}
