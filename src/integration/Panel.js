const fs = require('fs')
const fetch = require('node-fetch')
import bcrypt from 'bcrypt'

export default class Panel {
    constructor(handler) {
        this.handler = handler
        this.sessionKeys = {}
    }

    getUserFromCookie(cookie) {
        let sessionKey = this.getSessionKeyFromCookie(cookie)
        if (!sessionKey) return null
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
        if (!cookie) return null
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
            let loginDate = this.parseDateToPST(login.dataValues.loggedIn)
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

        let setAvailable = ''
        if (this.handler.crumbs.items[item].available) {
            setAvailable = `<button class="btn btn-danger" style='font-size: 2vh;'type="submit">Make unavailable</button>`
        } else {
            setAvailable = `<button class="btn btn-success" style='font-size: 2vh;'type="submit">Make available</button>`
        }

        page = page.replaceAll('{{ item.setAvailable }}', setAvailable)

        res.send(page)
    }

    async updateAvailablity(req, res) {
        let item = parseInt(req.body.item)
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

        this.sendMessageToWorldServers('getavailability', {item})

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

    async getVerifyPage(req, res) {
        let page = this.getTemplatePage('verify')
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        let unverifiedUsers = await this.handler.db.getUnverifiedUsers()
        let unverifiedUsersTable = ''
        let searchQuery = req.url.split('?')[1]
        if (searchQuery && searchQuery.length > 0) {
            unverifiedUsers = unverifiedUsers.filter((penguin) => {
                return penguin.username.toLowerCase().includes(searchQuery.toLowerCase())
            })
            unverifiedUsers.forEach((user) => {
                if (user.username.toLowerCase() == searchQuery.toLowerCase()) {
                    unverifiedUsers.splice(unverifiedUsers.indexOf(user), 1)
                    unverifiedUsers.unshift(user)
                }
            })
        }
        for (let penguin of unverifiedUsers) {
            unverifiedUsersTable += `<table class="table table-bordered"><thead><tr><th scope="row"><button type="button" class="btn btn-primary" data-toggle="tooltip" data-placement="top" title="${penguin.joinTime}">${penguin.username}</button></th><th scope="row"><form action="/manager/verify/approve/?${penguin.id}" name='verify' method="POST" onsubmit=""><input type="submit" value="Approve" class="btn btn-success"></form></th><th scope="row"><form action="/manager/verify/reject/?${penguin.id}" name='verify' method="POST" onsubmit=""><input type="hidden" name="language" id="language" value='${penguin.language}'><input type="submit" value="Reject" class="btn btn-danger"></form></th></tr></thead></table>`
        }

        page = page.replaceAll('{{ penguin.username }}', user)
        page = page.replaceAll('{{ unverified_users }}', unverifiedUsersTable)

        res.send(page)
    }

    async verifyApprove(req, res) {
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        let penguin = await this.handler.db.getUserById(req.url.split('?')[1])

        if (!penguin) {
            return res.send('<script>window.location.href = "/manager/verify"</script>')
        }

        await this.handler.db.users.update(
            {
                username_approved: 1,
                username_rejected: 0
            },
            {
                where: {
                    id: penguin.dataValues.id
                }
            }
        )

        res.send('<script>window.location.href = "/manager/verify"</script>')
    }

    async verifyReject(req, res) {
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        let penguin = await this.handler.db.getUserById(req.url.split('?')[1])

        if (!penguin) {
            return res.send('<script>window.location.href = "/manager/verify"</script>')
        }

        await this.handler.db.users.update(
            {
                username_rejected: 1,
                username_approved: 0
            },
            {
                where: {
                    id: penguin.dataValues.id
                }
            }
        )

        res.send('<script>window.location.href = "/manager/verify"</script>')
    }

    async getManagePlayersPage(req, res) {
        let page = this.getTemplatePage('manage')
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        // Similar to items page, but for players

        page = page.replaceAll('{{ penguin.username }}', user)

        let USERS = await this.handler.db.getAllUsers()

        let userTablePages = []

        for (let i = 0; i < Object.keys(USERS).length / 100; i++) {
            let userTable = ''
            for (let j of Object.keys(USERS).slice(i * 100, i * 100 + 100 > Object.keys(USERS).length ? Object.keys(USERS).length : i * 100 + 100)) {
                let user = USERS[j]
                userTable += `<table class="table table-bordered"><thead><tr><th scope="row"><button type="button" class="btn btn-primary" data-toggle="tooltip" data-placement="top" title="${user.joinTime}">${user.username}</button></th><th scope="row"><a class="btn btn-success" role="button" href="/manager/edit/?${user.id}">Edit Player</a></th></tr></thead></table>`
            }
            userTablePages.push(userTable)
        }

        let pageNumbers = ''

        for (let i = 0; i < userTablePages.length; i++) {
            pageNumbers += `<a type="button" class="nav-item nav-link" onclick="switchUsersPage(${i})" id="page_${i}-tab" data-toggle="tab" href="#page_${i}" role="tab" aria-controls="page_${i}" aria-selected="false">${i + 1}</a>`
        }

        page = page.replace('{{ users_table }}', userTablePages[0])

        page = page.replace(
            '{{ pages }} ',
            `[${userTablePages
                .map((i) => {
                    return '`' + i + '`'
                })
                .join(', ')}]`
        )

        page = page.replace('{{ pageNumbers }}', pageNumbers)

        res.send(page)
    }

    async getEditPlayerPage(req, res) {
        let page = this.getTemplatePage('edit-player')
        let user = this.getUserFromCookie(req.headers.cookie)

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }
        let id = req.url.split('?')[1]

        if (!id) {
            return res.send('<script>window.location.href = "/manager/manage"</script>')
        }

        let player = await this.handler.db.getUserById(id)

        if (!player) {
            return res.send('<script>window.location.href = "/manager/manage"</script>')
        }

        page = page.replaceAll('{{ penguin.username }}', user)

        page = page.replaceAll('{{ player.avatar }}', `<iframe src="/avatar?${id}" style="width: 100%; height: 100%; border: none;"></iframe>`)
        let playerRank = this.getRankNameFromId(player.dataValues.rank)
        page = page.replaceAll('{{ player.rank }}', playerRank)
        page = page.replaceAll('{{ player.id }}', player.dataValues.id)
        page = page.replaceAll('{{ player.username }}', player.dataValues.username)
        if (player.dataValues.email) {
            let email = player.dataValues.email.split('@')[0]
            let emailDomain = player.dataValues.email.split('@')[1]
            email = email[0] + '*'.repeat(email.length - 2) + email[email.length - 1]
            page = page.replaceAll('{{ player.email }}', email + '@' + emailDomain)
        } else {
            page = page.replaceAll('{{ player.email }}', 'None')
        }
        page = page.replaceAll('{{ player.registration_date }}', this.parseDateToPST(player.dataValues.joinTime))
        page = page.replaceAll('{{ player.coins }}', player.dataValues.coins)
        page = page.replaceAll('{{ player.isModerator }}', player.dataValues.rank > 2 ? 'Yes' : 'No')
        let ban = await this.handler.db.getActiveBanDetails(id)
        page = page.replaceAll('{{ player.isBanned }}', ban ? 'Yes' : 'No')
        let banCount = await this.handler.db.getBanCount(id)
        page = page.replaceAll('{{ player.timesBanned }}', banCount)
        if (ban) {
            let hoursLeft = Math.round((new Date(ban.expires).getTime() - new Date().getTime()) / 1000 / 60 / 60)
            let moderator
            if (ban.moderatorId) {
                moderator = await this.handler.db.getUserById(ban.moderatorId)
            } else {
                moderator = {
                    dataValues: {
                        username: 'Chat Filter',
                        rank: 6,
                        id: 0
                    }
                }
            }
            page = page.replaceAll('{{ player.currentBan }}', `<div class="table-responsive col-md-6"><strong>Latest Ban:</strong><table class="table table-bordered" style="width: 40vw;"><tr><td>Hours left:</td><td><strong>${hoursLeft} hours</strong></td></tr><tr><td>Occured:</td><td><strong>${this.parseDateToPST(ban.issued)}</strong></td></tr><tr><td>Placed By:</td><td><strong>[${this.getRankNameFromId(moderator.dataValues.rank)}] ${moderator.dataValues.username} (ID: ${moderator.dataValues.id})</strong></td></tr><tr><td>Expires:</td><td><strong>${this.parseDateToPST(ban.dataValues.expires)}</strong></td></tr><tr><td>Comment:</td><td><strong>${ban.message}</strong></td></tr></table></div>`)
        } else {
            page = page.replaceAll('{{ player.currentBan }}', '')
        }

        res.send(page)
    }

    async getAvatar(req, res) {
        let page = this.getTemplatePage('avatar')
        let args = req.url.split('?')[1]
        let id = args.split('&')[0]
        let size = args.split('&')[1]

        if (!id) {
            return res.send('Missing ID')
        }

        let user = await this.handler.db.getUserById(id)

        if (!user) {
            return res.send('Invalid ID')
        }

        page = page.replaceAll('{{ image_size }}', size || '88')

        page = page.replaceAll('{{ background_id }}', user.photo)
        page = page.replaceAll('{{ background_visible }}', user.photo != 0 ? 'visible' : 'hidden')
        page = page.replaceAll('{{ color_id }}', user.color)
        page = page.replaceAll('{{ head_id }}', user.head)
        page = page.replaceAll('{{ head_visible }}', user.head != 0 ? 'visible' : 'hidden')
        page = page.replaceAll('{{ face_id }}', user.face)
        page = page.replaceAll('{{ face_visible }}', user.face != 0 ? 'visible' : 'hidden')
        page = page.replaceAll('{{ neck_id }}', user.neck)
        page = page.replaceAll('{{ neck_visible }}', user.neck != 0 ? 'visible' : 'hidden')
        page = page.replaceAll('{{ body_id }}', user.body)
        page = page.replaceAll('{{ body_visible }}', user.body != 0 ? 'visible' : 'hidden')
        page = page.replaceAll('{{ hand_id }}', user.hand)
        page = page.replaceAll('{{ hand_visible }}', user.hand != 0 ? 'visible' : 'hidden')
        page = page.replaceAll('{{ feet_id }}', user.feet)
        page = page.replaceAll('{{ feet_visible }}', user.feet != 0 ? 'visible' : 'hidden')
        page = page.replaceAll('{{ flag_id }}', user.flag)
        page = page.replaceAll('{{ flag_visible }}', user.flag != 0 ? 'visible' : 'hidden')

        res.send(page)
    }

    async editPlayer(req, res) {
        let user = this.getUserFromCookie(req.headers.cookie)
        let player = req.body.player
        let type = req.body.type

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        if (!player || !type) {
            return res.send('Missing player or type')
        }

        switch (type) {
            case 'username':
                let username = req.body.username
                if (!username || username.length < 4 || username.length > 12) {
                    return res.send('Invalid username')
                }
                await this.handler.db.users.update({username}, {where: {id: player}})
                break

            case 'email':
                let email = req.body.email
                if (!email || email.length < 4 || email.length > 100) {
                    return res.send('Invalid email')
                }
                await this.handler.db.users.update({email}, {where: {id: player}})
                break

            case 'password':
                let password = req.body.password
                if (!password || password.length < 4 || password.length > 100) {
                    return res.send('Invalid password')
                }
                password = await bcrypt.hash(password, parseInt(process.env.cryptoRounds))
                await this.handler.db.users.update({password}, {where: {id: player}})
                break

            case 'coins':
                let coins = parseInt(req.body.coins)
                if (!coins || isNaN(coins) || coins < 0 || coins > 999999999) {
                    return res.send('Invalid coins')
                }
                await this.handler.db.users.update({coins}, {where: {id: player}})
                break

            default:
                return res.send('Invalid type')
        }
        res.send(`<script>window.location.href = "/manager/edit/?${player}"</script>`)
    }

    async getAddBanPage(req, res) {
        let page = this.getTemplatePage('addban')
        let user = this.getUserFromCookie(req.headers.cookie)
        let id = req.url.split('?')[1]

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        if (!id) {
            return res.send('<script>window.location.href = "/manager/manage"</script>')
        }

        let player = await this.handler.db.getUserById(id)

        if (!player) {
            return res.send('<script>window.location.href = "/manager/manage"</script>')
        }

        page = page.replaceAll('{{ penguin.username }}', user)
        page = page.replaceAll('{{ player.id }}', id)
        page = page.replaceAll('{{ player.username }}', player.dataValues.username)
        page = page.replaceAll('{{ player.rank }}', this.getRankNameFromId(player.dataValues.rank))
        page = page.replaceAll('{{ player.avatar }}', `<iframe src="/avatar?${id}" style="width: 100%; height: 100%; border: none;"></iframe>`)

        res.send(page)
    }

    async addBan(req, res) {
        let user = this.getUserFromCookie(req.headers.cookie)
        let id = req.body.playerId
        let hours = req.body.banLength
        let reason = req.body.banReason

        if (!user) {
            return res.send('<script>window.location.href = "/manager/login"</script>')
        }

        if (!id || !hours || !reason) {
            return res.send('Missing ID, hours or reason')
        }

        let player = await this.handler.db.getUserById(id)

        if (!player) {
            return res.send('<script>window.location.href = "/manager/manage"</script>')
        }

        let moderator = await this.handler.db.getUserByUsername(user)

        if (!moderator) {
            return res.send('<script>window.location.href = "/manager/manage"</script>')
        }

        let expires = new Date()
        expires.setHours(expires.getHours() + parseInt(hours))

        await this.handler.db.bans.create({
            userId: id,
            moderatorId: moderator.dataValues.id,
            expires,
            message: reason
        })

        res.send(`<script>window.location.href = "/manager/edit/?${id}"</script>`)
    }

    parseDateToPST(date) {
        let newDate = {
            dateObj: new Date(date)
        }
        newDate.dateObj.setHours(newDate.dateObj.getHours() - 8)
        newDate.year = newDate.dateObj.getFullYear()
        newDate.month = newDate.dateObj.getMonth() + 1
        newDate.day = newDate.dateObj.getDate()
        newDate.hour = newDate.dateObj.getHours()
        newDate.minute = newDate.dateObj.getMinutes()
        for (let i in newDate) {
            if (i == 'dateObj') continue
            if (newDate[i].toString().length == 1) {
                newDate[i] = '0' + newDate[i].toString()
            }
        }

        return `${newDate.year}-${newDate.month}-${newDate.day} ${newDate.hour}:${newDate.minute} PST`
    }

    getRankNameFromId(rank) {
        let playerRank
        switch (rank) {
            case 1:
                playerRank = 'Member'
                break
            case 2:
                playerRank = 'QA / Beta Tester'
                break
            case 3:
                playerRank = 'Moderator'
                break
            case 4:
                playerRank = 'Administrator'
                break
            case 5:
                playerRank = 'Owner'
                break
            case 6:
                playerRank = 'SYSTEM'
                break
        }
        return playerRank
    }
}
