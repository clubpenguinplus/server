import Handler from '../Handler'
import crypto from 'crypto'

export default class MiniGame extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'a#sg': this.startGame,
            'a#sg': this.sendMove,
            'a#eg': this.gameOver,
            'mi#eg': this.endMinigame,
            'a#pc': this.placeCounter,
            'mi#spl': this.setCannonData,
            'j#as3': this.joinAS3,
        }

        this.defaultScoreGames = [904, 905, 906, 912, 916, 917, 918, 919, 950, 952]
    }

    startGame(args, user) {
        if (user.inWaddleGame) {
            user.waddle.startGame(user)
        }
    }

    async endMinigame(args, user) {
        if (!args[0] || args[0] < 0) {
            return
        }

        let categoryStamps = []
        let ownedCategoryStamps = []

        let category

        switch (args[1].toLowerCase()) {
            case 'aquagrabber':
                category = 13
                break
            case 'astrobarrier':
                category = 14
                break
            case 'card':
                category = 38
                break
            case 'cjfire':
                category = 32
                break
            case 'cjsnow':
                category = 60
                break
            case 'cjwater':
                category = 34
                break
            case 'cartsurfer':
                category = 28
                break
            case 'catchinwaves':
                category = 15
                break
            case 'icefishing':
                category = 52
                break
            case 'jetpackadventure':
                category = 11
                break
            case 'pizzatron':
                category = 54
                break
            case 'pufflelaunch':
                category = 48
                break
            case 'pufflerescue':
                category = 57
                break
            case 'smoothie':
                category = 58
                break
            case 'sysdef':
                category = 46
                break
            case 'thinice':
                category = 16
                break
            case 'treasurehunt':
                category = 56
                break
        }

        for (var stamp in this.crumbs.stamps) {
            if (this.crumbs.stamps[stamp].groupid == category) {
                categoryStamps.push(stamp)
                if (user.stamps.includes(parseInt(stamp))) ownedCategoryStamps.push(stamp)
            }
        }

        let payoutFrequency = args[0] * 50
        let unixTime = new Date().getTime()
        if (user.lastPayout > unixTime - payoutFrequency) {
            return user.sendXt('e', 11)
        }
        if (args[0] < 15000) {
            if (categoryStamps.length > 1 && ownedCategoryStamps.length === categoryStamps.length) {
                args[0] = Math.round(args[0] * 2)
            }
            user.lastPayout = new Date().getTime()
            user.updateCoins(args[0])
            user.sendXt('eg', `${user.data.coins}%${args[1]}%${args[0]}`)

            this.handler.api.apiFunction('/logTransaction', {amount: args[0], user: user.data.id, reason: args[1], total: user.data.coins})
        } else {
            user.sendXt('e', 12)
        }
    }

    sendMove(args, user) {
        if (user.inWaddleGame) {
            user.waddle.sendMove(args, user)
        }
    }

    async gameOver(args, user) {
        if (!user.room.game) {
            return
        }

        let coins = await this.getCoinsEarned(user, args[0])
        user.updateCoins(coins)

        user.sledrace.setFinished(user.data.username, coins)
    }

    async getCoinsEarned(user, score) {
        if (user.inWaddleGame) {
            return await user.waddle.getPayout(user, score)
        } else if (user.room.id in this.defaultScoreGames) {
            return score
        } else {
            return Math.ceil(score / 10)
        }
    }

    async placeCounter(args, user) {
        if ((user.waddle.game = 'four')) {
            await user.waddle.placeCounter(args, user)
        }
    }

    setCannonData(args, user) {
        user.update({cannon_data: args[0]})
    }

    async joinAS3(args, user) {
        user.waffleauth = crypto.randomBytes(16).toString('hex')
        user.sendXt('as3', `${args[0]}%${user.waffleauth}`)
    }
}
