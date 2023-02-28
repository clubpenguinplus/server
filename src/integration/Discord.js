import {Client, Intents} from 'discord.js'
const fs = require('fs')

export default class Discord {
    constructor(handler) {
        this.handler = handler
        this.ready = false
        if (!process.env.discordBotToken) return
        const token = process.env.discordBotToken
        const dcbot = new Client({
            intents: [Intents.FLAGS.GUILDS],
        })
        this.dcbot = dcbot
        this.dcbot.once('ready', () => {
            this.handler.log.info('Discord Bot initialised')
            this.ready = true
        })

        this.dcbot.on('interactionCreate', async (interaction) => {
            try {
                let commandName = interaction.commandName

                let args = {}
                for (let opt in interaction.options._hoistedOptions) {
                    let option = interaction.options._hoistedOptions[opt]
                    args[option.name] = option.value
                }

                if (commandName === 'getitemavailable') {
                    let response = (await this.handler.api.apiFunction('/getItemAvaliable', {item: args.item})) ? 'Item id ' + args.item + ' is available.' : 'Item id ' + args.item + ' is not available.'
                    await interaction.reply(response)
                } else if (commandName === 'setitemavailable') {
                    if ((await this.handler.api.apiFunction('/setItemAvaliable', {item: args.item, available: args.available})) === 'OK') {
                        await interaction.reply('Item id ' + args.item + ' is now ' + (args.available ? 'available' : 'unavailable'))
                    }
                } else if (commandName === 'setmultipleitemsavailable') {
                    let items = args.items.split(',')
                    for (let item of items) {
                        if ((await this.handler.api.apiFunction('/setItemAvaliable', {item: item, available: args.available})) !== 'OK') {
                        }
                    }
                    await interaction.reply('These items are now ' + (args.available ? 'available' : 'unavailable'))
                } else if (commandName === 'getitemreleases') {
                    let response = await this.handler.api.apiFunction('/getItemReleases', {item: args.item})
                    if (!response) {
                        return await interaction.reply('Item id ' + args.item + ' has never been released.')
                    }
                    await interaction.reply(response)
                } else if (commandName === 'getusercreationlog') {
                    await interaction.reply('This function returns personal data about a user and therefore is not available on Discord.')
                } else if (commandName === 'getuserchatlog') {
                    let chatlog = await this.handler.api.apiFunction('/getUserChatLog', {user: args.user})
                    if (chatlog == 'USER NOT FOUND OR HAS NEVER CHATTED') {
                        await interaction.reply('User ' + args.user + ' does not exist or has never sent a chat message.')
                    } else {
                        fs.writeFileSync('./.tmp', chatlog)
                        interaction.reply({
                            content: 'Here is the chatlog for the user with id ' + args.user,
                            files: [{attachment: `./.tmp`, name: `${args.user}-log.txt`}],
                        })
                    }
                } else if (commandName === 'getuserkicklog') {
                    let kicklog = await this.handler.api.apiFunction('/getUserKickLog', {user: args.user})
                    if (kicklog == 'USER NOT FOUND OR HAS NEVER BEEN KICKED') {
                        await interaction.reply('User ' + args.user + ' does not exist or has never been kicked.')
                    } else {
                        fs.writeFileSync('./.tmp', transactionlog)
                        interaction.reply({
                            content: 'Here is the kicklog for the user with id ' + args.user,
                            files: [{attachment: `./.tmp`, name: `${args.user}-log.txt`}],
                        })
                    }
                } else if (commandName === 'getuserbanlog') {
                    let banlog = await this.handler.api.apiFunction('/getUserBanLog', {user: args.user})
                    if (banlog == 'USER NOT FOUND OR HAS NEVER BEEN BANNED') {
                        await interaction.reply('User ' + args.user + ' does not exist or has never been banned.')
                    } else {
                        fs.writeFileSync('./.tmp', banlog)
                        interaction.reply({
                            content: 'Here is the banlog for the user with id ' + args.user,
                            files: [{attachment: `./.tmp`, name: `${args.user}-log.txt`}],
                        })
                    }
                } else if (commandName === 'getuserwarnlog') {
                    let warnlog = await this.handler.api.apiFunction('/getUserWarnLog', {user: args.user})
                    if (warnlog == 'USER NOT FOUND OR HAS NEVER BEEN WARNED') {
                        await interaction.reply('User ' + args.user + ' does not exist or has never been warned.')
                    } else {
                        fs.writeFileSync('./.tmp', warnlog)
                        interaction.reply({
                            content: 'Here is the warnlog for the user with id ' + args.user,
                            files: [{attachment: `./.tmp`, name: `${args.user}-log.txt`}],
                        })
                    }
                } else if (commandName === 'getusermutelog') {
                    let mutelog = await this.handler.api.apiFunction('/getUserMuteLog', {user: args.user})
                    if (mutelog == 'USER NOT FOUND OR HAS NEVER BEEN MUTED') {
                        await interaction.reply('User ' + args.user + ' does not exist or has never been muted.')
                    } else {
                        fs.writeFileSync('./.tmp', mutelog)
                        interaction.reply({
                            content: 'Here is the mutelog for the user with id ' + args.user,
                            files: [{attachment: `./.tmp`, name: `${args.user}-log.txt`}],
                        })
                    }
                } else if (commandName === 'getuserloginlog') {
                    await interaction.reply('This function returns personal data about a user and therefore is not available on Discord.')
                } else if (commandName === 'getusertransactionlog') {
                    let transactionlog = await this.handler.api.apiFunction('/getUserTransactionLog', {user: args.user})
                    if (transactionlog == 'USER NOT FOUND OR HAS NEVER MADE A TRANSACTION') {
                        await interaction.reply('User ' + args.user + ' does not exist or has never made a transaction.')
                    } else {
                        fs.writeFileSync('./.tmp', transactionlog)
                        interaction.reply({
                            content: 'Here is the transactionlog for the user with id ' + args.user,
                            files: [{attachment: `./.tmp`, name: `${args.user}-log.txt`}],
                        })
                    }
                } else if (commandName === 'getpopulation') {
                    let population = await this.handler.api.apiFunction('/getPopulation', {world: args.server})
                    await interaction.reply(`The population of ${args.server} is ${population}`)
                }
            } catch (error) {
                this.handler.log.error(error)
            }
        })
        this.dcbot.login(token)
        handler.discord = this
    }

    logChatMessage(username, message, room, toxicity, profanity, sexual) {
        if (!this.ready) return
        const channel = this.dcbot.channels.cache.get(process.env.chatLogChannel)
        channel.send(`**USER:** ${username}\n**SENT MESSAGE:** ${message}\n**IN ROOM:** ${room}\n**TOXICITY:** ${toxicity}\n**PROFANITY:** ${profanity}\n**SEXUAL:** ${sexual}`)
    }

    logLogin(username) {
        if (!this.ready) return
        const channel = this.dcbot.channels.cache.get(process.env.loginLogChannel)
        channel.send(`**USER:** ${username} **LOGGED IN**`)
    }

    kickLogs(moderator, user) {
        if (!this.ready) return
        const channel = this.dcbot.channels.cache.get(process.env.modLogChannel)
        channel.send(`**MODERATOR:** ${moderator} **KICKED USER** ${user}`)
    }

    banLogs(moderator, user, duration, expires) {
        if (!this.ready) return
        const channel = this.dcbot.channels.cache.get(process.env.modLogChannel)
        channel.send(`**MODERATOR:** ${moderator} **BANNED USER** ${user} **FOR** ${duration} **UNTIL** ${expires}`)
    }

    addItemLogs(moderator, user, item) {
        if (!this.ready) return
        const channel = this.dcbot.channels.cache.get(process.env.modLogChannel)
        channel.send(`**MODERATOR:** ${moderator} **ADDED ITEM** ${item} **TO USER** ${user}`)
    }

    addCoinLogs(moderator, user, coins) {
        if (!this.ready) return
        const channel = this.dcbot.channels.cache.get(process.env.modLogChannel)
        channel.send(`**MODERATOR:** ${moderator} **ADDED** ${coins} **COINS TO USER** ${user}`)
    }

    changeUsernameLogs(moderator, oldname, newname) {
        if (!this.ready) return
        const channel = this.dcbot.channels.cache.get(process.env.modLogChannel)
        channel.send(`**MODERATOR:** ${moderator} **CHANGED THE USERNAME OF** ${oldname} **TO** ${newname}`)
    }

    reportPlayer(reason, username, id, reporterUsername) {
        if (!this.ready) return
        const channel = this.dcbot.channels.cache.get(process.env.reportPlayerChannel)
        if (reason == 'lang') {
            channel.send({
                content: `**USER:** ${reporterUsername} **REPORTED** ${username} **FOR INAPPROPRIATE LANGUAGE**\nPlease can a <@&968646503834988555> review the most recent lines on the attached chat log.\nTIP: If taking action, remember to copy-paste the username into the mod panel in case they use something like a capital i instead of an L`,
                files: [{attachment: `./logs/chat/${id}.log`, name: `${username}-log.txt`}],
            })
        } else if (reason == 'name') {
            channel.send(`**USER:** ${reporterUsername} **REPORTED** ${username} **FOR HAVING AN INAPPROPRIATE USERNAME**\nPlease can a <@&968646503834988555> research this username in more detail to check if it is inappropriate or not.\nTIP: If taking action, remember to copy-paste the username into the mod panel in case they use something like a capital i instead of an L`)
        } else if (reason == 'igloo') {
            channel.send(`**USER:** ${reporterUsername} **REPORTED** ${username} **FOR HAVING AN INAPPROPRIATE IGLOO**\nPlease can a <@&968646503834988555> log on and review the suitability of their igloo.\nTIP: If taking action, remember to copy-paste the username into the mod panel in case they use something like a capital i instead of an L`)
        }
    }

    errorAlert(error) {
        if (!this.ready) return
        const botadmin = this.dcbot.channels.cache.get(process.env.errorChannel)
        botadmin.send(`**ERROR:** ${error} **REPORTED**`)
    }
}
