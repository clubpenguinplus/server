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
                    let response = (await this.handler.analytics.getItemAvailability(args.item)) ? 'Item id ' + args.item + ' is available.' : 'Item id ' + args.item + ' is not available.'
                    await interaction.reply(response)
                } else if (commandName === 'setitemavailable') {
                    await this.handler.analytics.setItemAvailability(args.item, args.available)
                    await interaction.reply('Item id ' + args.item + ' is now ' + (args.available ? 'available' : 'unavailable'))
                } else if (commandName === 'setmultipleitemsavailable') {
                    let items = args.items.split(',')
                    for (let item of items) {
                        await this.handler.analytics.setItemAvailability(item, args.available)
                    }
                    await interaction.reply('These items are now ' + (args.available ? 'available' : 'unavailable'))
                } else if (commandName === 'getitemreleases') {
                    let response = await this.handler.analytics.getItemReleases(args.item)
                    if (!response) {
                        return await interaction.reply('Item id ' + args.item + ' has never been released.')
                    }
                    await interaction.reply(response)
                } else if (commandName === 'getusercreationlog') {
                    await interaction.reply('This function returns personal data about a user and therefore is not available on Discord.')
                } else if (commandName === 'getuserchatlog') {
                    await interaction.reply('TODO')
                } else if (commandName === 'getuserkicklog') {
                    await interaction.reply('TODO')
                } else if (commandName === 'getuserbanlog') {
                    await interaction.reply('TODO')
                } else if (commandName === 'getuserwarnlog') {
                    await interaction.reply('TODO')
                } else if (commandName === 'getusermutelog') {
                    await interaction.reply('TODO')
                } else if (commandName === 'getuserloginlog') {
                    await interaction.reply('This function returns personal data about a user and therefore is not available on Discord.')
                } else if (commandName === 'getusertransactionlog') {
                    await interaction.reply('TODO')
                } else if (commandName === 'getpopulation') {
                    let population = await this.handler.getServerPopulations
                    await interaction.reply(population)
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
