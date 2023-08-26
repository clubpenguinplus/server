import Analytics from '../integration/Analytics'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import {EventEmitter} from 'events'

export default class BaseHandler {
    constructor(id, users, db, log) {
        this.id = id
        this.users = users
        this.db = db
        db.handler = this
        this.log = log

        this.events = new EventEmitter({captureRejections: true})
        this.events.on('error', (error) => {
            this.log.error(`[${this.id}] Event error: ${error.stack}`)
        })

        this.analytics = new Analytics(this)

        this.handlers = {}
    }

    getCrumb(type) {
        const data = fs.readFileSync(`./crumbs/${type}.json`)
        return JSON.parse(data)
    }

    get population() {
        return Object.keys(this.users).length
    }

    loadHandlers() {
        fs.readdirSync(this.dir).forEach((handler) => {
            let handlerImport = require(path.join(this.dir, handler)).default
            let handlerObject = new handlerImport(this)

            this.handlers[handler] = handlerObject

            this.loadEvents(handlerObject)
        })
    }

    loadEvents(handler) {
        for (let event in handler.events) {
            this.events.on(event, handler.events[event].bind(handler))
        }
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
                            method: 'POST'
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

    async updateCosts() {
        for (let item of Object.keys(this.crumbs.items)) {
            this.crumbs.items[item].cost = (await this.analytics.getItemCost(item)) || this.crumbs.items[item].cost
            this.crumbs.items[item].available = (await this.analytics.getItemAvailability(item)) ? true : false
        }
        this.log.info(`[${this.id}] Loaded ${Object.keys(this.crumbs.items).length} items`)
    }
}
