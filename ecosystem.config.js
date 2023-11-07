const config = require('./config/config.json')


let apps = Object.keys(config.worlds[process.env.environment]).map(world => {
    return {
        name: world,
        script: './dist/World.js',
        args: world
    }
})

module.exports = {
    apps: apps
}