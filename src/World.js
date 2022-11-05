import Database from './database/Database'
import DataHandler from './handlers/DataHandler'
import LoginHandler from './handlers/LoginHandler'
import Server from './server/Server'

const {Logtail} = require('@logtail/node')

require('dotenv').config()

class World extends Server {
    constructor(id, iteration) {
        let users = {}
        let db = new Database()

        let handler = id == 'Login' ? LoginHandler : DataHandler
        let log = process.env.logtailToken ? new Logtail(process.env.logtailToken) : console
        handler = new handler(id, users, db, log)

        super(id, users, db, handler, iteration)
    }
}

let args = process.argv.slice(2)

let iteration = 0
for (let world of args) {
    new World(world, iteration)
    iteration++
}
