import fs from 'fs'
import path from 'path'
import Sequelize from 'sequelize'

const Op = Sequelize.Op

export default class Database {
    constructor() {
        this.handler = new Object()
        this.handler.log = new Object()
        this.handler.log.info = console.info
        this.handler.log.error = console.error

        this.sequelize = new Sequelize(process.env.dbName, process.env.dbUser, process.env.dbPassword, {
            host: process.env.dbHost,
            port: process.env.dbPort,
            dialect: process.env.dbDialect,
            logging: process.env.dbDebug == 'true' ? this.handler.log.info : false
        })

        // Used to translate type id to string
        this.slots = ['color', 'head', 'face', 'neck', 'body', 'hand', 'feet', 'flag', 'photo', 'award']

        this.dir = `${__dirname}/models`
        this.loadModels()

        this.sequelize
            .authenticate()
            .then(() => {
                // Connected
            })
            .catch((error) => {
                this.handler.log.error(`[Database] Unable to connect to the database: ${error}`)
            })
    }

    loadModels() {
        fs.readdirSync(this.dir).forEach((model) => {
            let modelImport = require(path.join(this.dir, model)).default
            let modelObject = modelImport.init(this.sequelize, Sequelize)

            if (process.env.environment == 'local') {
                modelObject.sync()
            }

            let name = model.charAt(0).toLowerCase() + model.slice(1, -3)

            this[name] = modelObject

            const update = this[name].update
            this[name].update = async (values, options) => {
                try {
                    return await update.call(this[name], values, options)
                } catch (error) {
                    this.handler.log.error(error)
                }
            }

            const destroy = this[name].destroy
            this[name].destroy = async (options) => {
                try {
                    return await destroy.call(this[name], options)
                } catch (error) {
                    this.handler.log.error(error)
                }
            }

            const create = this[name].create
            this[name].create = async (values, options) => {
                try {
                    return await create.call(this[name], values, options)
                } catch (error) {
                    this.handler.log.error(error)
                }
            }

            const findAll = this[name].findAll
            this[name].findAll = async (options) => {
                try {
                    return await findAll.call(this[name], options)
                } catch (error) {
                    this.handler.log.error(error)
                }
            }

            const findOne = this[name].findOne
            this[name].findOne = async (options) => {
                try {
                    return await findOne.call(this[name], options)
                } catch (error) {
                    this.handler.log.error(error)
                }
            }
        })
    }

    async getUserByUsername(username) {
        return await this.findOne('users', {
            where: {
                username: username
            }
        })
    }

    async getUserByEmail(email) {
        return await this.findOne('users', {
            where: {
                email: email
            }
        })
    }

    async getUserById(userId) {
        return await this.findOne('users', {
            where: {
                id: userId
            }
        })
    }

    async getAuthToken(userId, selector) {
        return await this.findOne('authTokens', {
            where: {
                userId: userId,
                selector: selector
            }
        })
    }

    async getActiveBan(userId) {
        var longestBan
        let bans = await this.findAll('bans', {
            where: {
                userId: userId,
                expires: {
                    [Op.gt]: Date.now()
                }
            }
        })
        for (let x in bans) {
            if (!longestBan || bans[x].expires > longestBan.expires) {
                longestBan = bans[x]
            }
        }
        return longestBan ? longestBan.expires : 0
    }

    async getBanCount(userId) {
        return await this.bans.count({
            where: {
                userId: userId
            }
        })
    }

    async getFriends(userId) {
        return await this.findAll(
            'buddies',
            {
                where: {
                    userId: userId
                },
                attributes: ['buddyId', 'isBff']
            },
            [],
            (result) => {
                return result.map((result) => [result.buddyId, result.isBff])
            }
        )
    }

    async getIgnores(userId) {
        return await this.findAll(
            'ignores',
            {
                where: {
                    userId: userId
                },
                attributes: ['ignoreId']
            },
            [],
            (result) => {
                return result.map((result) => result.ignoreId)
            }
        )
    }

    async getInventory(userId) {
        return await this.findAll(
            'inventories',
            {
                where: {
                    userId: userId
                },
                attributes: ['itemId']
            },
            [],
            (result) => {
                return result.map((result) => result.itemId)
            }
        )
    }

    async getStamps(userId) {
        return await this.findAll(
            'userStamps',
            {
                where: {
                    userId: userId
                },
                attributes: ['stampId']
            },
            [],
            (result) => {
                return result.map((result) => result.stampId)
            }
        )
    }

    async getIglooInventory(userId) {
        return await this.findAll(
            'iglooInventories',
            {
                where: {
                    userId: userId
                },
                attributes: ['iglooId']
            },
            [],
            (result) => {
                return result.map((result) => result.iglooId)
            }
        )
    }

    async getFlooringInventory(userId) {
        return await this.findAll(
            'flooringInventories',
            {
                where: {
                    userId: userId
                },
                attributes: ['floorId']
            },
            [],
            (result) => {
                return result.map((result) => result.floorId)
            }
        )
    }

    async getLocationInventory(userId) {
        return await this.findAll(
            'locationInventories',
            {
                where: {
                    userId: userId
                },
                attributes: ['locationId']
            },
            [],
            (result) => {
                return result.map((result) => result.locationId)
            }
        )
    }

    async getFurnitureInventory(userId) {
        return await this.findAll(
            'furnitureInventories',
            {
                where: {
                    userId: userId
                },
                attributes: ['itemId', 'quantity'],
                raw: true
            },
            {},
            (result) => {
                return this.arrayToObject(result, 'itemId', 'quantity')
            }
        )
    }

    async getActiveCode(code) {
        if (!code) return false
        let c = await this.findOne('codes', {
            where: {
                code: code,
                active: 1
            },
            attributes: ['id', 'code', 'coins'],
            raw: true
        })
        if (c) {
            return c
        } else {
            return false
        }
    }

    async getCodeItems(code) {
        if (!code) return []
        return await this.findAll('codeItems', {
            where: {
                codeId: code
            },
            attributes: ['itemId'],
            raw: true
        })
    }

    async getUsedCodes(code, user) {
        if (!code || !user) return false
        return await this.findOne('usedCodes', {
            where: {
                codeId: code,
                userId: user
            },
            attributes: ['codeId'],
            raw: true
        })
    }

    async getIgloo(userId, iglooId) {
        if (iglooId == null) {
            let user = await this.getUserById(userId)
            iglooId = user.dataValues.current_igloo
        }

        return await this.findOne(
            'userIgloos',
            {
                where: {
                    userId: userId,
                    iglooId: iglooId
                },
                raw: true
            },
            null,
            async (result) => {
                // Add furniture to igloo object
                result.furniture = await this.getUserFurnitures(userId, iglooId)
                result.likes = (await this.getIglooLikes(userId, iglooId)).length
                return result
            }
        )
    }

    async getUserFurnitures(userId, iglooId) {
        return await this.findAll(
            'userFurnitures',
            {
                where: {
                    userId: userId,
                    iglooId: iglooId
                },
                raw: true
            },
            [],
            (result) => {
                // Removes user id from all objects in furniture array
                return result.map(({userId, ...furnitures}) => furnitures)
            }
        )
    }

    async getUnverifedUsers(userId) {
        return await this.findAll('users', {
            where: {
                username_approved: '0',
                username_rejected: '0'
            }
        })
    }

    async searchForUsers(username) {
        let exactMatch = await this.findOne('users', {
            where: {
                username: username
            }
        })

        let closeMatch = await this.findAll('users', {
            where: {
                username: {
                    [Op.like]: '%' + username + '%'
                }
            }
        })

        if (!exactMatch) {
            return closeMatch
        } else {
            for (var i = closeMatch.length - 1; i >= 0; i--) {
                if (closeMatch[i].username === exactMatch.username) {
                    closeMatch.splice(i, 1)
                }
            }
            closeMatch.unshift(exactMatch)
            return closeMatch
        }
    }

    async addCoins(userID, coins) {
        let user = await this.getUserById(userID)

        this.users.update(
            {
                coins: parseInt(user.dataValues.coins) + parseInt(coins)
            },
            {
                where: {
                    id: userID
                }
            }
        )
    }

    async addItem(userID, item) {
        var inventory = await this.getInventory(userID)
        var checkItem = await this.findOne('items', {
            where: {
                id: item
            }
        })

        // A user having 2 of the same items would probably cause some issues

        if (inventory.includes(item)) {
            return
        }

        // If an item that doesn't exist is added to a user, the game will crash on load

        if (!checkItem) {
            return
        }

        this.inventories.create({
            userId: userID,
            itemId: item
        })

        return true
    }

    async ban(userId, banDuration, modId, message) {
        this.bans.create({
            userId: userId,
            expires: banDuration,
            moderatorId: modId,
            message: message
        })
    }

    async changeUsername(userId, newUsername) {
        if (newUsername.length < 4) return false
        if (newUsername.length > 16) return false

        let existingUser = await this.getUserByUsername(newUsername)
        if (existingUser) return false

        this.users.update(
            {
                username: newUsername
            },
            {
                where: {
                    id: userId
                }
            }
        )

        return true
    }

    async updatePassword(userId, password) {
        if (password.length < 5) return false
        if (password.length > 32) return false
        let hash = await bcrypt.hash(password, 10)
        this.users.update(
            {
                password: hash
            },
            {
                where: {
                    id: userId
                }
            }
        )
        return true
    }

    async getPuffle(userId, puffleId) {
        return await this.findOne('userPuffles', {
            where: {
                id: puffleId,
                userId: userId
            },
            attributes: ['id', 'species', 'name', 'food', 'play', 'rest', 'clean', 'isBackyard', 'dateAdopted']
        })
    }

    async getPuffles(userId, isBackyard = 0) {
        return await this.findAll('userPuffles', {
            where: {
                userId: userId,
                isBackyard: isBackyard
            },
            attributes: ['id', 'species', 'name', 'food', 'play', 'rest', 'clean']
        })
    }

    async getWellbeing(puffleId) {
        return await this.findOne('userPuffles', {
            where: {
                id: puffleId
            },
            attributes: ['food', 'play', 'rest', 'clean', 'name']
        })
    }

    async getPuffleSpecies(puffleId) {
        return (
            await this.findOne('userPuffles', {
                where: {
                    id: puffleId
                },
                attributes: ['species']
            })
        ).species
    }

    async getPuffleCount(userId) {
        let puffles = await this.findAll('userPuffles', {
            where: {
                userId: userId
            },
            attributes: ['id']
        })
        return puffles.length
    }

    async adoptPuffle(userId, type, name) {
        let puffles = await this.getPuffles(userId)
        let backyard = puffles.length >= 10
        let puffle = await this.userPuffles.create({
            userId: userId,
            species: type,
            name: name,
            isBackyard: backyard
        })
        return puffle
    }

    async getReleasedItems(user) {
        let releasedItems = await this.findAll('items', {
            where: {
                latestRelease: {
                    [Op.gt]: new Date(user.data.joinTime)
                }
            }
        })
        let releasedItemIDs = []

        for (var x in releasedItems) {
            releasedItemIDs.push(releasedItems[x].dataValues.id)
        }

        let obtainableItems = await this.findAll('items', {
            where: {
                obtainable: 1
            }
        })

        for (var x in obtainableItems) {
            if (!releasedItemIDs.includes(obtainableItems[x].dataValues.id)) {
                releasedItemIDs.push(obtainableItems[x].dataValues.id)
            }
        }

        return releasedItemIDs
    }

    async getReleasedPins(user) {
        let releasedPins = await this.findAll('items', {
            where: {
                latestRelease: {
                    [Op.gt]: user.data.joinTime
                },
                type: 8
            }
        })

        let releasedPinIDs = []

        for (var x in releasedPins) {
            releasedPinIDs.push(releasedPins[x].dataValues.id)
        }

        let obtainablePins = await this.findAll('items', {
            where: {
                obtainable: 1,
                type: 8
            }
        })

        for (var x in obtainablePins) {
            if (!releasedPinIDs.includes(obtainablePins[x].dataValues.id)) {
                releasedPinIDs.push(obtainablePins[x].dataValues.id)
            }
        }

        return releasedPinIDs
    }

    async getTeam(userId) {
        let team = await this.findOne('partyCompletion', {
            where: {
                penguinId: userId,
                party: 'PenguinGames0722',
                info: 'team'
            },
            attributes: ['value']
        })
        if (team) return team.value
        return undefined
    }

    async setTeam(userId, team) {
        this.partyCompletion.create({
            penguinId: userId,
            party: 'PenguinGames0722',
            info: 'team',
            value: team
        })
    }

    async getPartyCompletion(userId, party) {
        let completion = await this.findAll('partyCompletion', {
            where: {
                penguinId: userId,
                party: party
            },
            attributes: ['info', 'value']
        })
        return this.arrayToObject(completion, 'info', 'value')
    }

    async getPendingFriends(userId) {
        let f = await this.findAll(
            'pendingBuddies',
            {
                where: {recipient: userId},
                attributes: ['sender']
            },
            [],
            (result) => {
                return result.map((result) => result.sender)
            }
        )

        for (var x in f) {
            f[x] = await this.findOne(
                'users',
                {
                    where: {
                        id: f[x]
                    },
                    attributes: ['id', 'username', 'username_approved']
                },
                [],
                (result) => {
                    return result.username_approved == 1 ? `${result.id}|${result.username}` : `${result.id}|P${result.id}`
                }
            )
        }

        return f.join()
    }

    async getPostcards(userId) {
        let postcards = await this.findAll('userPostcards', {
            where: {
                userId: userId
            },
            attributes: ['id', 'userId', 'sender', 'time_sent', 'details']
        })
        return postcards
    }

    async createAccount(username, password, email, over13, color, ip, activationKey) {
        let user = await this.users.create({
            username: username,
            password: password,
            email: email,
            over13: over13,
            color: color,
            ip: ip,
            activationKey: activationKey
        })
        return user
    }

    async validIp(ip) {
        let user = await this.users.findOne({
            where: {
                ip: ip
            },
            attributes: ['joinTime']
        })

        for (let x in user) {
            // check if there is a user with the same ip created inside the last 48 hours
            if (new Date(user[x].joinTime).getTime > new Date().getTime() - 1000 * 60 * 60 * 48) {
                return false
            }
        }
        return true
    }

    async checkAllowedIp(user, ip) {
        let allowedIps = await this.findAll('twoFA', {
            where: {
                userId: user
            },
            attributes: ['ip', 'isAllowed']
        })
        for (let x in allowedIps) {
            if (allowedIps[x].ip == ip) {
                return allowedIps[x].isAllowed == 1
            }
        }
        return false
    }

    async getIglooLikes(user, igloo) {
        return (
            await this.findAll('iglooLikes', {
                where: {
                    userId: user,
                    iglooId: igloo
                },
                attributes: ['likerId']
            })
        ).map((like) => {
            return like.dataValues.likerId
        })
    }

    async getQuestCompletion(userId, quest) {
        return await this.findOne('questCompletion', {
            where: {
                user: userId,
                id: quest
            },
            attributes: ['completion', 'info']
        })
    }

    async setQuestCompletion(userId, quest, completion, info = null) {
        let questCompletion = await this.findOne('questCompletion', {
            where: {
                user: userId,
                id: quest
            },
            attributes: ['completion']
        })
        if (questCompletion) {
            this.questCompletion.update(
                {
                    completion: completion,
                    info: info
                },
                {
                    where: {
                        user: userId,
                        id: quest
                    }
                }
            )
        } else {
            this.questCompletion.create({
                user: userId,
                id: quest,
                completion: completion,
                info: info
            })
        }
    }

    async getGlobalChallenges() {
        return (
            await this.findAll('globalChallenges', {
                attributes: ['id', 'challenge_id'],
                where: {
                    expires: {
                        [Op.gt]: new Date()
                    }
                }
            })
        ).map((challenge) => {
            return {
                id: challenge.dataValues.id,
                challenge_id: challenge.dataValues.challenge_id
            }
        })
    }

    async assignGlobalChallenges(userId) {
        const globalChallenges = await this.getGlobalChallenges()
        for (let challenge of globalChallenges) {
            await this.assignGlobalChallenge(userId, challenge)
        }
    }

    async assignGlobalChallenge(userId, challenge) {
        let challengeCompletion = await this.findOne('challenges', {
            where: {
                global_id: challenge.id,
                user_id: userId
            }
        })
        if (challengeCompletion) return
        this.challenges.create({
            global_id: challenge.id,
            user_id: userId,
            challenge_id: challenge.challenge_id
        })
    }

    async assignChallenge(userId, challenge) {
        let activeChallenges = await this.findAll('challenges', {
            where: {
                user_id: userId,
                complete: 0,
                global_id: null
            }
        })
        if (activeChallenges.length >= 3) return false
        for (let activeChallenge of activeChallenges) {
            if (activeChallenge.dataValues.challenge_id == challenge) return true
        }
        this.challenges.create({
            user_id: userId,
            challenge_id: challenge
        })
    }

    async getUserGlobalChallenges(userId) {
        let userGlobalChallenges = []
        let globalChallenges = await this.getGlobalChallenges()
        for (let challenge of globalChallenges) {
            let challengeCompletion = await this.findOne('challenges', {
                where: {
                    global_id: challenge.id,
                    user_id: userId
                }
            })
            if (challengeCompletion) {
                userGlobalChallenges.push(challengeCompletion.dataValues)
            }
        }
        return userGlobalChallenges
    }

    async getUserChallenges(userId) {
        let activeChallenges = await this.findAll('challenges', {
            where: {
                user_id: userId,
                complete: 0,
                global_id: null
            }
        })
        activeChallenges = activeChallenges.map((challenge) => {
            return challenge.dataValues
        })
        let oneDayAgo = new Date(Date.now() - 86400000)
        let todayChallenge = await this.findOne('challenges', {
            where: {
                user_id: userId,
                set: {
                    [Op.gt]: oneDayAgo
                },
                global_id: null
            }
        })
        if (todayChallenge) {
            todayChallenge = todayChallenge.dataValues
            for (let activeChallenge of activeChallenges) {
                if (activeChallenge.id == todayChallenge.id) {
                    return activeChallenges
                }
            }
            activeChallenges.push(todayChallenge)
        }
        return activeChallenges
    }

    async getChallengeCompletion(userId, id) {
        return await this.findOne('challenges', {
            where: {
                user_id: userId,
                id: id
            },
            attributes: ['completion']
        })
    }

    async setGlobalChallenge(challengeId, expires) {
        await this.globalChallenges.create({
            challenge_id: challengeId,
            expires: expires
        })
    }

    /*========== Helper functions ==========*/

    findOne(table, options = {}, emptyReturn = null, callback = null) {
        return this.find('findOne', table, options, emptyReturn, callback)
    }

    findAll(table, options = {}, emptyReturn = null, callback = null) {
        return this.find('findAll', table, options, emptyReturn, callback)
    }

    find(find, table, options, emptyReturn, callback) {
        return this[table][find](options).then((result) => {
            if (callback && result) {
                return callback(result)
            } else if (result) {
                return result
            } else {
                return emptyReturn
            }
        })
    }

    arrayToObject(array, key, value = null) {
        return array.reduce((obj, item) => {
            // If a value is passed in then the key will be mapped to item[value]
            let result = value ? item[value] : item

            obj[item[key]] = result
            delete item[key]

            return obj
        }, {})
    }
}
