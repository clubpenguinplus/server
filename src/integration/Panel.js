const fs = require('fs')
const fetch = require('node-fetch')

export default class Panel {
    constructor(handler) {
        this.handler = handler
        this.sessionKeys = {}
    }

    getUserFromCookie(cookie) {
        let sessionKey = this.getSessionKeyFromCookie(cookie)
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

        let userAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
        let loginSuccessful = (await this.handler.handlers['Login.js'].comparePasswords(req.body.username, req.body.password, {}, {address: userAddress}, true)) === true
        this.sessionKeys[req.body.username] = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

        if (loginSuccessful) {
            // Make the success alert visible
            page = page.replace(/(<div class="alert alert-success" role="alert" style=")display: none;(">){{ success_message }}<\/div>/g, '$1display: block;$2Login successful</div>')
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

    async getItemsPage(req, res) {
        let page = this.getTemplatePage('items')
        let user = this.getUserFromCookie(req.headers.cookie)

        let searchQuery = req.url.split('?')[1] ? req.url.split('?')[1].replace('%20', ' ') : undefined

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        page = page.replaceAll('{{ penguin.username }}', user)

        let ITEMS = this.handler.crumbs.items

        if (searchQuery) {
            let searchResults = []
            for (let item in ITEMS) {
                if (item.includes(searchQuery) || (ITEMS[item].name && ITEMS[item].name.toLowerCase().includes(searchQuery.toLowerCase()))) {
                    searchResults.push(item)
                }
            }
            ITEMS = {}
            for (let item of searchResults) {
                ITEMS[item] = this.handler.crumbs.items[item]
            }
        }

        let itemTablePages = []
        for (let i = 0; i < Object.keys(ITEMS).length / 100; i++) {
            let itemTable = ''
            for (let j of Object.keys(ITEMS).slice(i * 100, i * 100 + 100 > Object.keys(ITEMS).length ? Object.keys(ITEMS).length : i * 100 + 100)) {
                let item = this.handler.crumbs.items[j]
                itemTable += `<tr><th scope="row" style="font-size: 90%;"><img src="https://media.cpplus.pw/client/media/clothing/icon/${j}.webp" style="height:5vh"/></th><th scope="row" style="font-size: 90%;">${j}</th><th scope="row" style="font-size: 90%;"><a href="/manager/item?${j}">${item.name}</a></th><th scope="row" style="font-size: 90%;">${item.cost}</th></tr>`
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

    async getItemPage(req, res) {
        let item = req.url.split('?')[1]
        let page = this.getTemplatePage('item')
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        if (!item) {
            return res.send('<script>window.location.href = "/manager/items"</script>')
        }

        page = page.replaceAll('{{ penguin.username }}', user)
        page = page.replaceAll('{{ item.image }}', `<img src="https://media.cpplus.pw/client/media/clothing/icon/${item}.webp"/>`)
        page = page.replaceAll('{{ item.id }}', item)
        page = page.replaceAll('{{ item.name }}', this.handler.crumbs.items[item].name)
        page = page.replaceAll('{{ item.cost }}', this.handler.crumbs.items[item].cost)
        page = page.replaceAll('{{ item.available }}', this.handler.crumbs.items[item].available)

        let setAvaliable = ''
        if (this.handler.crumbs.items[item].available) {
            setAvaliable = `<button class="btn btn-danger" style='font-size: 2vh;'type="submit">Make unavailable</button>`
        } else {
            setAvaliable = `<button class="btn btn-success" style='font-size: 2vh;'type="submit">Make available</button>`
        }

        page = page.replaceAll('{{ item.setAvailable }}', setAvaliable)

        res.send(page)
    }

    async updateAvailablity(req, res) {
        let item = req.body.item
        let available = req.body.available == 'true' ? false : true
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        if (!item || available == undefined) {
            return res.send('Missing item or available')
        }

        this.handler.crumbs.items[item].available = available
        this.handler.analytics.setItemAvailability(item, available)

        this.sendMessageToWorldServers('getavaliability', {item})

        res.send(`<script>window.location.href = "/manager/item?${item}"</script>`)
    }

    async updateCost(req, res) {
        let item = req.body.item
        let cost = req.body.coins

        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        if (!item || !cost) {
            return res.send('Missing item or cost')
        }

        this.handler.crumbs.items[item].cost = cost
        await this.handler.analytics.setItemCost(item, cost)

        this.sendMessageToWorldServers('getnewcost', {item})

        res.send(`<script>window.location.href = "/manager/item?${item}"</script>`)
    }

    async sendMessageToWorldServers(endpoint, message) {
        for (let world in this.handler.crumbs.worlds[process.env.environment || 'production']) {
            try {
                await fetch(this.handler.crumbs.worlds[process.env.environment || 'production'][world].address + `/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: JSON.stringify(message)
                })
            } catch (error) {
                this.handler.log.error(`[HTTP] Error sending message to world ${world}: ${error.stack}`)
            }
        }
    }

    async logout(req, res) {
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        delete this.sessionKeys[user]

        let page = this.getTemplatePage('login')
        page = page.replace(/(<div class="alert alert-danger" role="alert" style=")display: none;(">){{ error_message }}<\/div>/g, '$1display: block;$2You are now logged out</div>')

        res.send(page)
    }
}
