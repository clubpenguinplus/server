import Friend from './Friend'
import FurnitureInventory from './FurnitureInventory'
import IglooInventory from './IglooInventory'
import FlooringInventory from './FlooringInventory'
import LocationInventory from './LocationInventory'
import Ignore from './Ignore'
import Inventory from './Inventory'
import Stamps from './Stamps'
import PurchaseValidator from './PurchaseValidator'
import fs from 'fs'
import AES from 'crypto-js/aes'

export default class User {
    constructor(socket, handler, encryptionKey, decryptionKey) {
        this.socket = socket
        this.handler = handler
        this.db = handler.db
        this.crumbs = handler.crumbs
        this.encryptionKey = encryptionKey
        this.decryptionKey = decryptionKey

        this.address

        this.validatePurchase = new PurchaseValidator(this)

        this.data
        this.room
        this.x = 0
        this.y = 0
        this.frame = 1
        this.sesWarns = 0

        this.messagesSentThisSession = 0
        this.snowballsThrownThisSession = 0
        this.timePlayed = 0

        this.friend
        this.ignore
        this.inventory

        this.waddle

        // Game server authentication
        this.authenticated = false
        this.token = {}

        setInterval(() => {
            this.timePlayed++
        }, 1000)

        this.partyData = {}

        this.setPuffleDecay()
    }

    get string() {
        const values = [this.data.id, this.data.username, this.data.color, this.data.head, this.data.face, this.data.neck, this.data.body, this.data.hand, this.data.feet, this.data.flag, this.data.photo, this.data.coins, this.x, this.y, this.frame, this.data.rank, this.data.stealthMode ? 1 : 0, this.data.username_approved ? 1 : 0, this.data.username_rejected ? 1 : 0, this.data.walking, this.data.epfStatus, new Date(this.data.joinTime).getTime()]
        return values.join('|')
    }

    get inWaddleGame() {
        return this.waddle && this.room.game && this.waddle.id == this.room.id
    }

    get isModerator() {
        return this.data.rank >= 3
    }

    get isBeta() {
        return this.data.rank >= 2
    }

    get address() {
        let headers = this.socket.handshake.headers

        if (headers['x-forwarded-for']) {
            return headers['x-forwarded-for'].split(',')[0]
        }

        return this.socket.handshake.address
    }

    async setFriends(friends) {
        this.friend = new Friend(this)
        await this.friend.init(friends)
    }

    async setIgnores(ignores) {
        this.ignore = new Ignore(this)
        await this.ignore.init(ignores)
    }

    setInventory(inventory) {
        this.inventory = new Inventory(this, inventory)
    }

    setIglooInventory(inventory) {
        this.iglooInventory = new IglooInventory(this, inventory)
    }

    setFurnitureInventory(inventory) {
        this.furnitureInventory = new FurnitureInventory(this, inventory)
    }

    setFlooringInventory(inventory) {
        this.flooringInventory = new FlooringInventory(this, inventory)
    }

    setLocationInventory(inventory) {
        this.locationInventory = new LocationInventory(this, inventory)
    }

    setStamps(stamps) {
        this.stamps = new Stamps(this, stamps)
    }

    setPostcards(postcards) {
        this.postcards = postcards
    }

    setItem(slot, item) {
        if (this.data[slot] == item) return

        this.data[slot] = item
        this.room.sendXt(this, 'up', `${this.data.id}%${item}%${slot}`, [])

        this.update({
            [slot]: item,
        })
    }

    updateCoins(coins) {
        if (!coins) {
            return
        }
        if (!this.data.coins || this.data.coins < 0) {
            this.data.coins = 0
        }

        this.data.coins += parseInt(coins)
        this.update({
            coins: this.data.coins,
        })
    }

    joinRoom(room, x = 0, y = 0) {
        if (!room || room === this.room) {
            return
        }

        if (room.isFull) {
            return this.sendXt('e', 3)
        }

        this.room.remove(this)

        this.room = room
        this.x = x
        this.y = y
        this.frame = 1

        this.room.add(this)
    }

    joinSoloRoom(room) {
        if (!room || room === this.room) {
            return
        }

        this.room.remove(this)

        this.room = room

        this.room.add(this)
    }

    update(query) {
        this.db.users.update(query, {
            where: {
                id: this.data.id,
            },
        })
    }

    sendXml(xml) {
        let payload = AES.encrypt(xml, this.encryptionKey).toString()
        this.socket.emit('message', payload)
    }

    sendXt(action, args = '') {
        let payload = AES.encrypt(`%xt%${action}%${args}%`, this.encryptionKey).toString()
        this.socket.emit('message', payload)
    }

    close() {
        this.socket.disconnect(true)
    }

    updateStats() {
        if (!this.data) return
        this.data.messagesSent += this.messagesSentThisSession
        this.data.snowballsThrown += this.snowballsThrownThisSession
        this.data.timePlayed += this.timePlayed

        this.update({
            messagesSent: this.data.messagesSent,
            snowballsThrown: this.data.snowballsThrown,
            timePlayed: this.data.timePlayed,
        })
    }

    async setPuffleDecay() {
        if (!this.data) return setTimeout(() => this.setPuffleDecay(), 1000)
        let puffles = await this.db.userPuffles.findAll({
            where: {
                userId: this.data.id,
            },
        })
        let loginLength = new Date().getTime() - new Date(this.data.last_login).getTime()
        let decay = Math.floor(Math.floor(loginLength / 1000 / 60 / 60 / 24) * 3.5)
        for (let puffle of puffles) {
            let food = puffle.dataValues.food - decay
            let play = puffle.dataValues.play - decay
            let rest = puffle.dataValues.rest - decay
            let clean = puffle.dataValues.clean - decay
            if (play < 0) play = 0
            if (rest < 0) rest = 0
            if (clean < 0) clean = 0
            if (food < 0 || play + rest + clean < 0) {
                await this.db.userPuffles.destroy({
                    where: {
                        id: puffle.dataValues.id,
                    },
                })
                let postcard
                switch (puffle.dataValues.color) {
                    case '0':
                        postcard = 100
                        break
                    case '1':
                        postcard = 101
                        break
                    case '2':
                        postcard = 102
                        break
                    case '3':
                        postcard = 103
                        break
                    case '4':
                        postcard = 104
                        break
                    case '5':
                        postcard = 105
                        break
                    case '6':
                        postcard = 106
                        break
                    case '7':
                        postcard = 107
                        break
                    case '8':
                        postcard = 108
                        break
                    case '9':
                        postcard = 109
                        break
                    case '10':
                        postcard = 185
                        break
                    case '11':
                        postcard = 238
                        break
                    default:
                        postcard = 100
                        break
                }
                let postcardEntry = await this.db.userPostcards.create({
                    userId: user.data.id,
                    id: postcard,
                    sender: 'Club Penguin Plus',
                    details: puffle.dataValues.name,
                })
                if (postcardEntry) {
                    this.postcards = await this.db.getPostcards(this.data.id)
                    let postcards = this.postcards.map((postcard) => {
                        return `${postcard.id}|${postcard.sender}|${postcard.details}`
                    })
                    this.sendXt('up', postcards.join())
                }
                continue
            }
            this.db.userPuffles.update(
                {
                    food: food,
                    play: play,
                    rest: rest,
                    clean: clean,
                },
                {
                    where: {
                        id: puffle.dataValues.id,
                    },
                }
            )
        }
        this.data.last_login = new Date()
        this.update({
            last_login: this.data.last_login,
        })
    }

    endAS3Game(auth, game, score, endroom) {
        if (auth != this.waffleauth) return
        delete this.waffleauth

        let coins = score / 10

        if (!coins || coins < 0) {
            return
        }

        let categoryStamps = []
        let ownedCategoryStamps = []

        let category

        switch (game.toLowerCase()) {
            case 'smoothie':
                category = 58
                break
        }

        for (var stamp in this.crumbs.stamps) {
            if (this.crumbs.stamps[stamp].groupid == category) {
                categoryStamps.push(stamp)
                if (this.stamps.includes(parseInt(stamp))) ownedCategoryStamps.push(stamp)
            }
        }

        let payoutFrequency = coins * 50
        let unixTime = new Date().getTime()
        if (this.lastPayout > unixTime - payoutFrequency) {
            return this.sendXt('e', 11)
        }
        if (coins < 15000) {
            if (categoryStamps.length > 1 && ownedCategoryStamps.length === categoryStamps.length) {
                coins = Math.round(coins * 2)
            }
            this.lastPayout = new Date().getTime()
            this.updateCoins(coins)
            this.sendXt('endas3', endroom)
            this.sendXt('eg', `${this.data.coins}%${game}%${coins}`)

            this.handler.analytics.transaction(this.data.id, coins, game)
        } else {
            this.sendXt('e', 12)
        }
    }

    stampEarnedAS3(auth, stamp) {
        if (auth != this.waffleauth) return
        if (this.stamps.includes(stamp)) return

        this.stamps.add(stamp)
        this.sendXt('sse', stamp)
    }
}
