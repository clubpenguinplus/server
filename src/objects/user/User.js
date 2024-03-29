import Friend from './Friend'
import FurnitureInventory from './FurnitureInventory'
import IglooInventory from './IglooInventory'
import FlooringInventory from './FlooringInventory'
import LocationInventory from './LocationInventory'
import Ignore from './Ignore'
import Inventory from './Inventory'
import Stamps from './Stamps'
import PurchaseValidator from './PurchaseValidator'
import {EventEmitter} from 'events'
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

        this.friend
        this.ignore
        this.inventory

        this.waddle

        // Game server authentication
        this.authenticated = false
        this.token = {}

        this.partyData = {}

        this.challenges = []
        this.globalChallenges = []
        this.setChallenges()

        this.setPuffleDecay()

        this.events = new EventEmitter()
    }

    get string() {
        const values = [this.data.id, this.data.username, this.data.color, this.data.head, this.data.face, this.data.neck, this.data.body, this.data.hand, this.data.feet, this.data.flag, this.data.photo, this.data.coins, this.x, this.y, this.frame, this.data.rank, this.data.stealthMode ? 1 : 0, this.data.username_approved ? 1 : 0, this.data.username_rejected ? 1 : 0, this.data.walking, this.data.epfStatus, new Date(this.data.joinTime).getTime(), this.data.medals]
        return values.join('|')
    }

    get shortString() {
        const values = [this.data.id, this.data.username_approved ? this.data.username : `P${this.data.id}`, this.data.color, this.data.head, this.data.face, this.data.neck, this.data.body, this.data.hand, this.data.feet, this.data.flag, this.data.photo]
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
            [slot]: item
        })
    }

    updateCoins(coins) {
        if (!coins) {
            return
        }
        // During CFC, all spent coins are donated to CFC
        if (coins < 0) {
            this.donateCoins(-coins)
            return
        }

        if (!this.data.coins || this.data.coins < 0) {
            this.data.coins = 0
        }

        this.data.coins += parseInt(coins)
        this.update({
            coins: this.data.coins
        })
    }

    donateCoins(coins) {
        if (!coins) {
            return
        }
        if (!this.data.coins || this.data.coins < 0) {
            this.data.coins = 0
        }

        if (coins < 0) {
            coins = -coins
        }

        this.handler.partyData.cfcTotal += coins

        this.data.coins -= parseInt(coins)
        this.data.cfcDonations += parseInt(coins)
        this.update({
            coins: this.data.coins,
            cfcDonations: this.data.cfcDonations
        })
    }

    updateMedals(medals) {
        if (!medals) {
            return
        }
        if (!this.data.medals || this.data.medals < 0) {
            this.data.medals = 0
        }

        this.data.medals += parseInt(medals)
        this.update({
            medals: this.data.medals
        })

        this.sendXt('sepfm', this.data.medals)
    }

    joinRoom(room, x = 0, y = 0) {
        if (!room || room === this.room) {
            return
        }

        if (room.isFull && !this.isModerator) {
            this.sendXt('e', 3)
            this.sendXt('jr', `${this.room.id}%${this.room.strings.join()}`)
            return
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
                id: this.data.id
            }
        })
    }

    sendXml(xml) {
        let payload = AES.encrypt(xml, this.encryptionKey).toString()
        this.socket.emit('message', payload)
    }

    sendXt(action, args = '') {
        let packet = `%xt%${action}%${args}%`
        if (process.env.debugPackets == 'true') this.handler.log.info(`[Server] Sent: ${packet} to ${this.address}`)
        let payload = AES.encrypt(packet, this.encryptionKey).toString()
        this.socket.emit('message', payload)
    }

    close() {
        this.socket.disconnect(true)
    }

    async setPuffleDecay() {
        if (!this.data) return setTimeout(() => this.setPuffleDecay(), 1000)
        let puffles = await this.db.userPuffles.findAll({
            where: {
                userId: this.data.id
            }
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
                        id: puffle.dataValues.id
                    }
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
                    userId: this.data.id,
                    id: postcard,
                    sender: 'Club Penguin Plus',
                    details: puffle.dataValues.name
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
                    clean: clean
                },
                {
                    where: {
                        id: puffle.dataValues.id
                    }
                }
            )
        }
        this.data.last_login = new Date()
        this.update({
            last_login: this.data.last_login
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
        if (categoryStamps.length > 1 && ownedCategoryStamps.length === categoryStamps.length) {
            coins = Math.round(coins * 2)
        }
        this.updateCoins(coins)
        this.sendXt('endas3', endroom)
        this.sendXt('eg', `${this.data.coins}%${game}%${coins}`)

        this.updateChallengeCompletions('coinsearned', game, coins)

        this.handler.analytics.transaction(this.data.id, coins, game)
    }

    stampEarnedAS3(auth, stamp) {
        if (auth != this.waffleauth) return
        if (this.stamps.includes(stamp)) return

        this.stamps.add(stamp)
        this.sendXt('sse', stamp)
    }

    async setChallenges() {
        if (!this.data) return setTimeout(() => this.setChallenges(), 1000)
        if (this.data.epfStatus != 1) return

        await this.db.assignGlobalChallenges(this.data.id)
        this.challenges = await this.db.getUserChallenges(this.data.id)
        this.globalChallenges = await this.db.getUserGlobalChallenges(this.data.id)

        if (this.challenges.length == 3) return

        const challengeIds = this.challenges.map((challenge) => challenge.challenge_id)

        let lastSetDate = null
        for (let challenge of this.challenges) {
            if (!lastSetDate || new Date(challenge.set).getTime() > new Date(lastSetDate).getTime()) {
                lastSetDate = challenge.set
            }
        }

        if (!lastSetDate || new Date().getTime() - new Date(lastSetDate).getTime() > 1000 * 60 * 60 * 24) {
            const challenges = Object.keys(this.crumbs.challenges.daily)
            let challenge
            do {
                challenge = challenges[Math.floor(Math.random() * challenges.length)]
            } while (challengeIds.includes(challenge))
            await this.db.assignChallenge(this.data.id, challenge)
        }

        this.challenges = await this.db.getUserChallenges(this.data.id)

        this.challenge
    }

    async updateChallengeCompletions(check, checkType, amount) {
        amount = parseInt(amount)
        for (let chalData of this.challenges) {
            let challenge = this.crumbs.challenges.daily[chalData.challenge_id]
            if (challenge.check == check && challenge.checktype.toLowerCase() == checkType.toLowerCase()) {
                let complete = chalData.completion + amount >= challenge.completion ? 1 : 0
                await this.updateChallengeCompletion(chalData.id, amount, complete, challenge.reward)
            }
        }

        for (let chalData of this.globalChallenges) {
            let challenge = this.crumbs.challenges.global[chalData.challenge_id]
            if (challenge.check == check && challenge.checktype.toLowerCase() == checkType.toLowerCase()) {
                let complete = chalData.completion + amount >= challenge.completion ? 1 : 0
                await this.updateChallengeCompletion(chalData.id, amount, complete, challenge.reward)
            }
        }

        await this.setChallenges()
    }

    async updateChallengeCompletion(id, amount, isComplete, reward = 0) {
        await this.db.challenges.update(
            {
                completion: isComplete ? 0 : this.db.sequelize.literal(`completion + ${amount}`),
                complete: isComplete ? 1 : 0
            },
            {
                where: {
                    id: id
                }
            }
        )

        if (isComplete) {
            this.updateMedals(reward)
        }
    }

    joinTable(table) {
        if (table && !this.minigameRoom) {
            this.minigameRoom = table

            this.minigameRoom.add(this)
        }
    }
}
