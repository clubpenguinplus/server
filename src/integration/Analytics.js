import Sequelize from 'sequelize'

const Op = Sequelize.Op

export default class Analytics {
    constructor(handler) {
        this.enabled = process.env.analyticsDbName ? true : false
        if (!this.enabled) return handler.log.warn('Analytics database not enabled. Analytics will not be tracked.')

        this.handler = handler

        this.tables = {}
        this.sequelize = new Sequelize(process.env.analyticsDbName, process.env.dbUser, process.env.dbPassword, {
            host: process.env.dbHost,
            port: process.env.dbPort,
            dialect: process.env.dbDialect,
            logging: process.env.dbDebug == 'true' ? this.handler.log.info : false
        })

        if (handler.id == 'Login') {
            this.dailyMaintenance()
        } else {
            setTimeout(() => this.hourlyMaintenance(), this.distanceToNextHour)
        }
    }

    get PSTDateObject() {
        return new Date(Date.now() - 8 * 60 * 60 * 1000)
    }

    get dateInPST() {
        // The offset from UTC to PST is -8 hours. If we run getUTCx() on this date, we get the correct time in PST.
        return this.PSTDateObject.getTime()
    }

    get hourInPST() {
        return this.PSTDateObject.getUTCHours()
    }

    get dayInPST() {
        return this.PSTDateObject.getUTCDate()
    }

    get monthInPST() {
        return this.PSTDateObject.getUTCMonth()
    }

    get yearInPST() {
        return this.PSTDateObject.getUTCFullYear()
    }

    get distanceToMidnight() {
        let midnight = new Date(this.PSTDateObject.getFullYear(), this.PSTDateObject.getMonth(), this.PSTDateObject.getDate() + 1).getTime()
        let now = this.dateInPST
        return midnight - now
    }

    get distanceToNextHour() {
        let nextHour = new Date(this.PSTDateObject.getFullYear(), this.PSTDateObject.getMonth(), this.PSTDateObject.getDate(), this.PSTDateObject.getHours() + 1).getTime()
        let now = this.dateInPST
        return nextHour - now
    }

    // Functions to track:

    // Non-analytic functions:

    async initItemTable() {
        this.tables['items'] = await this.sequelize.define(
            'items',
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                cost: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                releaseDate: {
                    type: Sequelize.DATEONLY,
                    allowNull: false,
                    primaryKey: true
                },
                availability: {
                    type: Sequelize.INTEGER(1),
                    allowNull: false,
                    defaultValue: 1
                }
            },
            {timestamps: false, tableName: 'items'}
        )
        await this.tables['items'].sync()
    }

    // - Get item availability
    async getItemAvailability(id) {
        if (!this.tables['items']) await this.initItemTable()
        const releases = await this.tables['items'].findAll({where: {id: id}})
        if (releases.length == 0) return false
        let latestRelease
        for (let release of releases) {
            if (!latestRelease || release.releaseDate > latestRelease.releaseDate) latestRelease = release
        }
        return latestRelease.availability
    }

    // - Set item availability
    async setItemAvailability(id, availability, cost) {
        if (!this.tables['items']) await this.initItemTable()
        await this.tables['items'].create({id: id, availability: availability, releaseDate: this.timeInPST})
    }

    // - Get item releases
    async getItemReleases(id) {
        if (!this.tables['items']) await this.initItemTable()
        const releases = await this.tables['items'].findAll({where: {id: id}})
        return releases
    }

    async getItemCost(id) {
        if (!this.tables['items']) await this.initItemTable()
        const releases = await this.tables['items'].findAll({where: {id: id}})
        if (releases.length == 0) return false
        let latestRelease
        for (let release of releases) {
            if (!latestRelease || release.releaseDate > latestRelease.releaseDate) latestRelease = release
        }
        return latestRelease.cost
    }

    // Analytic functions:

    // - User created
    async initUserCreationTable() {
        if (!this.enabled) return
        this.tables['userCreation'] = await this.sequelize.define(
            'user_creation',
            {
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                username: {
                    type: Sequelize.STRING(50),
                    allowNull: false
                },
                ip: {
                    type: Sequelize.STRING(50),
                    allowNull: false
                },
                email: {
                    type: Sequelize.STRING(50),
                    allowNull: false
                },
                date: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                color: {
                    type: Sequelize.STRING(50),
                    allowNull: false
                }
            },
            {timestamps: false, tableName: 'user_creation'}
        )
        await this.tables['userCreation'].sync()
    }

    async createUser(userId, username, ip, email, color) {
        if (!this.enabled) return
        if (!this.tables['userCreation']) await this.initUserCreationTable()
        await this.tables['userCreation'].create({userId: userId, username: username, ip: ip, email: email, color: color, date: this.dateInPST})
    }

    async getUserCreation(userId) {
        if (!this.enabled) return
        if (!this.tables['userCreation']) await this.initUserCreationTable()
        return await this.tables['userCreation'].findOne({where: {userId: userId}})
    }

    // - Chat message sent
    async initChatTable() {
        if (!this.enabled) return
        const tableName = `chat_${this.dayInPST}_${this.monthInPST + 1}_${this.yearInPST}`
        this.tables['chat'] = await this.sequelize.define(
            tableName,
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                message: {
                    type: Sequelize.STRING(500),
                    allowNull: false
                },
                date: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                room: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                filter: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                }
            },
            {timestamps: false, tableName: tableName}
        )
        await this.tables['chat'].sync()
    }

    async chatMessage(userId, message, room, filter) {
        if (!this.enabled) return
        if (!this.tables['chat']) await this.initChatTable()
        await this.tables['chat'].create({userId: userId, message: message, date: this.dateInPST, room: room, filter: filter})
    }

    async getUserChatLog(userId, bygoneDays = 0, startDay = 0) {
        if (!this.enabled) return
        if (!this.tables['chat']) await this.initChatTable()
        bygoneDays = Math.min(bygoneDays, 30)
        startDay = Math.min(startDay, bygoneDays)
        let messages = []
        for (let i = startDay; i <= bygoneDays; i++) {
            let date = new Date(this.dateInPST - i * 24 * 60 * 60 * 1000)
            let tableName = `chat_${date.getUTCDate()}_${date.getUTCMonth() + 1}_${date.getUTCFullYear()}`
            if (!this.tables[tableName]) {
                this.tables[tableName] = await this.sequelize.define(
                    tableName,
                    {
                        id: {
                            type: Sequelize.INTEGER(11),
                            allowNull: false,
                            primaryKey: true,
                            autoIncrement: true
                        },
                        userId: {
                            type: Sequelize.INTEGER(11),
                            allowNull: false
                        },
                        message: {
                            type: Sequelize.STRING(500),
                            allowNull: false
                        },
                        date: {
                            type: Sequelize.DATE,
                            allowNull: false,
                            defaultValue: Sequelize.NOW
                        },
                        room: {
                            type: Sequelize.INTEGER(11),
                            allowNull: false
                        }
                    },
                    {timestamps: false, tableName: tableName}
                )
                await this.tables[tableName].sync()
            }
            let messagesFromTable = await this.tables[tableName].findAll({where: {userId: userId}})
            messages = messages.concat(messagesFromTable)
        }
        return messages
    }

    async getRoomChatLog(room, bygoneDays = 0, startDay = 0) {
        if (!this.enabled) return
        if (!this.tables['chat']) await this.initChatTable()
        bygoneDays = Math.min(bygoneDays, 30)
        startDay = Math.min(startDay, bygoneDays)
        let messages = []
        for (let i = startDay; i <= bygoneDays; i++) {
            let date = new Date(this.dateInPST - i * 24 * 60 * 60 * 1000)
            let tableName = `chat_${date.getUTCDate()}_${date.getUTCMonth() + 1}_${date.getUTCFullYear()}`
            if (!this.tables[tableName]) {
                this.tables[tableName] = await this.sequelize.define(
                    tableName,
                    {
                        id: {
                            type: Sequelize.INTEGER(11),
                            allowNull: false,
                            primaryKey: true,
                            autoIncrement: true
                        },
                        userId: {
                            type: Sequelize.INTEGER(11),
                            allowNull: false
                        },
                        message: {
                            type: Sequelize.STRING(500),
                            allowNull: false
                        },
                        date: {
                            type: Sequelize.DATE,
                            allowNull: false,
                            defaultValue: Sequelize.NOW
                        },
                        room: {
                            type: Sequelize.INTEGER(11),
                            allowNull: false
                        }
                    },
                    {timestamps: false, tableName: tableName}
                )
                await this.tables[tableName].sync()
            }
            let messagesFromTable = await this.tables[tableName].findAll({where: {room: room}})
            messages = messages.concat(messagesFromTable)
        }
        return messages
    }

    // - User kicked
    async initKickTable() {
        if (!this.enabled) return
        this.tables['kick'] = await this.sequelize.define(
            'kick',
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                moderatorId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                date: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                reason: {
                    type: Sequelize.STRING(500),
                    allowNull: false
                }
            },
            {timestamps: false, tableName: 'kick'}
        )
        await this.tables['kick'].sync()
    }

    async kickUser(userId, moderatorId, reason) {
        if (!this.enabled) return
        if (!this.tables['kick']) await this.initKickTable()
        await this.tables['kick'].create({userId: userId, moderatorId: moderatorId, reason: reason, date: this.dateInPST})
    }

    async getUserKickLog(userId) {
        if (!this.enabled) return
        if (!this.tables['kick']) await this.initKickTable()
        return await this.tables['kick'].findAll({where: {userId: userId}})
    }

    async getModeratorKickLog(moderatorId) {
        if (!this.enabled) return
        if (!this.tables['kick']) await this.initKickTable()
        return await this.tables['kick'].findAll({where: {moderatorId: moderatorId}})
    }

    // - User banned
    async initBanTable() {
        if (!this.enabled) return
        this.tables['ban'] = await this.sequelize.define(
            'ban',
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                moderatorId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                date: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                reason: {
                    type: Sequelize.STRING(500),
                    allowNull: false
                },
                length: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                }
            },
            {timestamps: false, tableName: 'ban'}
        )
        await this.tables['ban'].sync()
    }

    async banUser(userId, moderatorId, reason, length) {
        if (!this.enabled) return
        if (!this.tables['ban']) await this.initBanTable()
        await this.tables['ban'].create({userId: userId, moderatorId: moderatorId, reason: reason, length: length, date: this.dateInPST})
    }

    async getUserBanLog(userId) {
        if (!this.enabled) return
        if (!this.tables['ban']) await this.initBanTable()
        return await this.tables['ban'].findAll({where: {userId: userId}})
    }

    // - User warned
    async initWarnTable() {
        if (!this.enabled) return
        this.tables['warn'] = await this.sequelize.define(
            'warn',
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                moderatorId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                date: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                reason: {
                    type: Sequelize.STRING(500),
                    allowNull: false
                }
            },
            {timestamps: false, tableName: 'warn'}
        )
        await this.tables['warn'].sync()
    }

    async warnUser(userId, moderatorId, reason) {
        if (!this.enabled) return
        if (!this.tables['warn']) await this.initWarnTable()
        await this.tables['warn'].create({userId: userId, moderatorId: moderatorId, reason: reason, date: this.dateInPST})
    }

    async getUserWarnLog(userId) {
        if (!this.enabled) return
        if (!this.tables['warn']) await this.initWarnTable()
        return await this.tables['warn'].findAll({where: {userId: userId}})
    }

    // - User muted
    async initMuteTable() {
        if (!this.enabled) return
        this.tables['mute'] = await this.sequelize.define(
            'mute',
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                moderatorId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                date: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                reason: {
                    type: Sequelize.STRING(500),
                    allowNull: false
                },
                length: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                }
            },
            {timestamps: false, tableName: 'mute'}
        )
        await this.tables['mute'].sync()
    }

    async muteUser(userId, moderatorId, reason, length) {
        if (!this.enabled) return
        if (!this.tables['mute']) await this.initMuteTable()
        await this.tables['mute'].create({userId: userId, moderatorId: moderatorId, reason: reason, length: length, date: this.dateInPST})
    }

    async getUserMuteLog(userId) {
        if (!this.enabled) return
        if (!this.tables['mute']) await this.initMuteTable()
        return await this.tables['mute'].findAll({where: {userId: userId}})
    }

    // - Login/logout
    async initLoginTable() {
        if (!this.enabled) return
        this.tables['sessions'] = await this.sequelize.define(
            'sessions',
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                loggedIn: {
                    type: Sequelize.DATE,
                    allowNull: false
                },
                ip: {
                    type: Sequelize.STRING(500),
                    allowNull: false
                },
                loggedOut: {
                    type: Sequelize.DATE,
                    allowNull: true
                }
            },
            {timestamps: false, tableName: 'sessions'}
        )
        await this.tables['sessions'].sync()
    }

    async login(userId, ip) {
        if (!this.enabled) return
        if (!this.tables['sessions']) await this.initLoginTable()
        await this.tables['sessions'].create({userId: userId, ip: ip, loggedIn: this.dateInPST})
    }

    async logout(userId) {
        if (!this.enabled) return
        if (!this.tables['sessions']) await this.initLoginTable()
        let logins = await this.tables['sessions'].findAll({where: {userId: userId, loggedOut: null}})
        logins = logins.sort((a, b) => a.loggedIn - b.loggedIn)
        if (logins.length > 0) {
            let mostRecentLogin = logins[0]
            for (let i = 1; i < logins.length; i++) {
                if (logins[i].loggedIn > mostRecentLogin.loggedIn) mostRecentLogin = logins[i]
            }
            mostRecentLogin.loggedOut = this.dateInPST
            await mostRecentLogin.save()
        }
    }

    async getUserLoginLog(userId) {
        if (!this.enabled) return
        if (!this.tables['sessions']) await this.initLoginTable()
        return await this.tables['sessions'].findAll({where: {userId: userId}})
    }

    // - Transaction occurred
    async initTransactionTable() {
        if (!this.enabled) return
        let tableName = `transactions_${this.dayInPST}_${this.monthInPST + 1}_${this.yearInPST}`
        this.tables['transactions'] = await this.sequelize.define(
            tableName,
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                amount: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                reason: {
                    type: Sequelize.STRING(500),
                    allowNull: false
                },
                date: {
                    type: Sequelize.DATE,
                    allowNull: false
                }
            },
            {timestamps: false, tableName: tableName}
        )
        await this.tables['transactions'].sync()
    }

    async transaction(userId, amount, reason) {
        if (!this.enabled) return
        if (!this.tables['transactions']) await this.initTransactionTable()
        await this.tables['transactions'].create({userId: userId, amount: amount, reason: reason, date: this.dateInPST})
    }

    // Maintenance functions (performed on login server only):

    async dailyMaintenance() {
        if (!this.enabled) return
        this.handler.log.info('[Analytics] Performing daily maintenance')
        await this.removeOldChatMessages()
        await this.groupTransactions()
        setTimeout(() => this.dailyMaintenance(), this.distanceToMidnight)
    }

    async hourlyMaintenance() {
        if (!this.enabled) return
        this.handler.log.info('[Analytics] Performing hourly maintenance')
        await this.updateTranslations()
        setTimeout(() => this.hourlyMaintenance(), this.distanceToNextHour)
    }

    // - Remove chat messages older than 30 days
    async removeOldChatMessages() {
        if (!this.enabled) return
        // Remove old chat tables
        let thirtyDaysAgo = new Date(this.dateInPST - 30 * 24 * 60 * 60 * 1000)
        let [results, metadata] = await this.sequelize.query(`SHOW TABLES LIKE 'chat_%'`)
        for (let i = 0; i < results.length; i++) {
            let tableName = results[i][Object.keys(results[i])[0]]
            // Tablename format: chat_DD_MM_YYYY
            let date = tableName.split('_')
            let day = parseInt(date[1])
            let month = parseInt(date[2])
            let year = parseInt(date[3])
            let tableDate = new Date(year, month - 1, day)
            if (tableDate < thirtyDaysAgo) {
                await this.sequelize.query(`DROP TABLE ${tableName}`)
            }
        }

        // Init new chat table
        await this.initChatTable()

        // Update chat view to point to new table(s)
        await this.updateChatView()
    }

    async updateChatView() {
        if (!this.enabled) return
        let [results, metadata] = await this.sequelize.query(`SHOW TABLES LIKE 'chat_%'`)
        let tables = []
        for (let i = 0; i < results.length; i++) {
            let tableName = results[i][Object.keys(results[i])[0]]
            if (tableName.includes('view')) continue // Skip view (if it exists)
            tables.push(tableName)
        }
        if (tables.length == 0) return
        let query = 'CREATE OR REPLACE VIEW chat_view AS '
        for (let table of tables) {
            query += `SELECT * FROM ${table} UNION `
        }
        query = query.substring(0, query.length - 7) // Remove last 'UNION '
        query += ';' // Add semicolon
        await this.sequelize.query(query)
    }

    // - Group transactions by user/day after 7 days
    async initPersistentTransactionTable() {
        if (!this.enabled) return
        this.tables['persistentTransactions'] = await this.sequelize.define(
            'persistent_transactions',
            {
                userId: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                date: {
                    type: Sequelize.DATEONLY,
                    allowNull: false,
                    primaryKey: true
                },
                coinsSpent: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                coinsEarned: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                }
            },
            {timestamps: false, tableName: 'persistent_transactions'}
        )
        await this.tables['persistentTransactions'].sync()
    }

    async groupTransactions() {
        if (!this.enabled) return
        if (!this.tables['persistentTransactions']) await this.initPersistentTransactionTable()
        const sevenDaysAgo = new Date(this.dateInPST - 7 * 24 * 60 * 60 * 1000)
        const [results, metadata] = await this.sequelize.query(`SHOW TABLES LIKE 'transactions_%'`)
        for (let i = 0; i < results.length; i++) {
            const tableName = results[i][Object.keys(results[i])[0]]
            // Tablename format: transactions_DD_MM_YYYY
            const date = tableName.split('_')
            const day = parseInt(date[1])
            const month = parseInt(date[2])
            const year = parseInt(date[3])
            const tableDate = new Date(year, month - 1, day)
            if (tableDate < sevenDaysAgo) {
                const transactions = await this.sequelize.query(`SELECT * FROM ${tableName}`)
                for (let transaction of transactions[0]) {
                    if (!transaction.userId) continue
                    const user = await this.tables['persistentTransactions'].findOne({where: {userId: transaction.userId, date: tableDate}})
                    if (user) {
                        if (transaction.amount > 0) {
                            user.coinsEarned += transaction.amount
                        } else {
                            user.coinsSpent += transaction.amount
                        }
                        await user.save()
                    } else {
                        await this.tables['persistentTransactions'].create({userId: transaction.userId, date: tableDate, coinsSpent: transaction.amount < 0 ? transaction.amount : 0, coinsEarned: transaction.amount > 0 ? transaction.amount : 0})
                    }
                }
                await this.sequelize.query(`DROP TABLE ${tableName}`)
            }
        }

        await this.initTransactionTable()
        // Update transactions view to point to new table(s)
        await this.updateTransactionView()
    }

    async updateTransactionView() {
        if (!this.enabled) return
        let [results, metadata] = await this.sequelize.query(`SHOW TABLES LIKE 'transactions_%'`)
        let tables = []
        for (let i = 0; i < results.length; i++) {
            let tableName = results[i][Object.keys(results[i])[0]]
            if (tableName.includes('view')) continue // Skip view (if it exists)
            tables.push(tableName)
        }
        if (tables.length == 0) return
        let query = 'CREATE OR REPLACE VIEW transactions_view AS '
        for (let table of tables) {
            query += `SELECT * FROM ${table} UNION `
        }
        query = query.substring(0, query.length - 7) // Remove last 'UNION '
        query += ';' // Add semicolon
        await this.sequelize.query(query)
    }

    async initTranslationTable() {
        this.tables['translation'] = await this.sequelize.define(
            'translation',
            {
                id: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                enChars: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                enMessages: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                ptChars: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                ptMessages: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                esChars: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                esMessages: {
                    type: Sequelize.INTEGER(11),
                    allowNull: false
                },
                time: {
                    type: Sequelize.DATE,
                    allowNull: false
                }
            },
            {timestamps: false, tableName: 'translation'}
        )
        await this.tables['translation'].sync()
    }

    async updateTranslations() {
        if (!this.enabled) return
        if (!this.tables['translation']) await this.initTranslationTable()
        this.tables['translation'].create({enChars: this.handler.translation.enChars, enMessages: this.handler.translation.enMessages, ptChars: this.handler.translation.ptChars, ptMessages: this.handler.translation.ptMessages, esChars: this.handler.translation.esChars, esMessages: this.handler.translation.esMessages, time: this.dateInPST})
        this.handler.translation = {
            enChars: 0,
            enMessages: 0,
            ptChars: 0,
            ptMessages: 0,
            esChars: 0,
            esMessages: 0
        }
    }
}
