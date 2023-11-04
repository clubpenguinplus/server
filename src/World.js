import Database from './database/Database'
import DataHandler from './handlers/DataHandler'
import LoginHandler from './handlers/LoginHandler'
import Server from './server/Server'

const {Logtail} = require('@logtail/node')
const configJson = require('../config/config.json')

require('dotenv').config()

class World extends Server {
    constructor(id) {
        let users = {}
        let db = new Database()

        let handler = id == 'Login' ? LoginHandler : DataHandler
        let log = process.env[`logtailToken${id}`] ? new Logtail(process.env[`logtailToken${id}`]) : console
        handler = new handler(id, users, db, log)

        let port = configJson.worlds[id].port

        super(id, users, db, handler, port)
    }
}

let args = process.argv.slice(2)

for (let world of args) {
    new World(world)
}
