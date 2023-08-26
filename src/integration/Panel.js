import {log} from 'console'
import {get} from 'http'

const fs = require('fs')

export default class Panel {
    constructor(handler) {
        this.handler = handler
        this.sessionKeys = {}
    }

    getUserFromCookie(cookie) {
        let sessionKey = this.getSessionKeyFromCookie(cookie)
        console.log(sessionKey, this.sessionKeys)
        for (let user in this.sessionKeys) {
            if (this.sessionKeys[user] == sessionKey) return user
        }
        return null
    }

    getTemplatePage(page) {
        return fs.readFileSync(`templates/panel/${page}.html`).toString()
    }

    async getLoginPage(req, res) {
        let page = this.getTemplatePage('login')
        res.send(page)
    }

    async login(req, res) {
        let page = this.getTemplatePage('login')

        let loginSuccessful = true
        this.sessionKeys[req.body.username] = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

        if (loginSuccessful) {
            // Make the success alert visible
            page = page.replace(/(<div class="alert alert-success" role="alert" style=")display: none;(">){{ success_message }}<\/div>/g, '$1display: block;$2{{ success_message }}</div>')
            page = page.replace('{{ success_message }}', 'Login successful')
            page = page.replace('{{ session_key }}', this.sessionKeys[req.body.username])
        } else {
            // Make the danger alert visible
            page = page.replace(/(<div class="alert alert-danger" role="alert" style=")display: none;(">){{ error_message }}<\/div>/g, '$1display: block;$2{{ error_message }}</div>')
            page = page.replace('{{ error_message }}', 'Invalid username or password')
        }

        res.send(page)
    }

    getSessionKeyFromCookie(cookie) {
        let sessionKey = ''
        let cookies = cookie.split(';')
        for (let cookie of cookies.reverse()) {
            if (cookie.includes('sessionKey')) {
                sessionKey = cookie.split('=')[1].trim()
            }
        }
        return sessionKey
    }

    async getMainPage(req, res) {
        let page = this.getTemplatePage('panel')
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        page = page.replaceAll('{{ penguin.username }}', user)

        let userObj = await this.handler.db.getUserByUsername(user)
        let logins = await this.handler.analytics.getUserLoginLog(userObj.dataValues.id)

        let loginHistory = ''
        for (let login of logins.reverse()) {
            let loginDate = new Date(login.dataValues.loggedIn).toUTCString().replace('GMT', 'PST')
            let loginIp = login.dataValues.ip
            let loginMinutesPlayed = Math.round((new Date(login.dataValues.loggedOut).getTime() - new Date(login.dataValues.loggedIn).getTime()) / 1000 / 60)
            if (loginMinutesPlayed < 0) loginMinutesPlayed = 'Unknown'
            loginHistory += `<tr><th scope="row" style='font-size: 90%;'>${loginDate}</th><th scope="row" style='font-size: 80%;'>${loginIp}</th><th scope="row" style='font-size: 90%;'>${loginMinutesPlayed}</th></tr>`
        }

        page = page.replace('{{ login_history }}', loginHistory)

        res.send(page)
    }

    /*
    await fetch(this.crumbs.worlds[process.env.environment || 'production'][world].address + '/getnewcost', {
        method: 'POST'
    })
    */

    async getItemsPage(req, res) {
        let page = this.getTemplatePage('items')
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        page = page.replaceAll('{{ penguin.username }}', user)

        let itemTablePages = []
        for (let i = 0; i < Object.keys(this.handler.crumbs.items).length / 100; i++) {
            let itemTable = ''
            for (let j of Object.keys(this.handler.crumbs.items).slice(i * 100, i * 100 + 100 > Object.keys(this.handler.crumbs.items).length ? Object.keys(this.handler.crumbs.items).length : i * 100 + 100)) {
                let item = this.handler.crumbs.items[j]
                itemTable += `<tr><th scope="row" style="font-size: 90%;"><img src="https://media.cpplus.pw/client/media/clothing/icon/${j}.webp" style="height:5vh"/></th><th scope="row" style="font-size: 90%;">${j}</th><th scope="row" style="font-size: 90%;">${item.name}</th><th scope="row" style="font-size: 90%;">${item.cost}</th></tr>`
            }
            itemTablePages.push(itemTable)
        }

        let pageNumbers = ''
        for (let i = 0; i < itemTablePages.length; i++) {
            pageNumbers += `<a type="button" class="nav-item nav-link" onclick="switchItemsPage(${i})" id="page_${i}-tab" data-toggle="tab" href="#page_${i}" role="tab" aria-controls="page_${i}" aria-selected="false">${i + 1}</a>`
        }

        page = page.replace('{{ items_table }}', itemTablePages[0])
        page = page.replace(
            '{{ pages }} ',
            `[${itemTablePages
                .map((i) => {
                    return '`' + i + '`'
                })
                .join(', ')}]`
        )
        page = page.replace('{{ pageNumbers }}', pageNumbers)

        res.send(page)
    }
}
