const fs = require('fs')

export default class Panel {
    constructor(handler) {
        this.handler = handler
    }

    getTemplatePage(page) {
        return fs.readFileSync(`templates/panel/${page}.html`).toString()
    }

    async getLoginPage(req, res) {
        let page = this.getTemplatePage('login')
        res.send(page)
    }

    async login(req, res) {
        console.log(req.body)
        res.send('ok')
    }
}
