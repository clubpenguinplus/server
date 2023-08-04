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
            'j#as3': this.joinAS3
        }

        this.defaultScoreGames = [904, 905, 906, 912, 916, 917, 918, 919, 950, 952]
    }

    startGame(args, user) {
        if (user.inWaddleGame) {
            user.waddle.startGame(user)
        }
    }

    async endMinigame(args, user) {
        if (!args[0] || args[0] < 0 || args[0] == 'NaN' || args[0] == 'null' || args[0] == 'undefined') args[0] = 0

        user.updateCoins(args[0])
        user.sendXt('eg', `${user.data.coins}%${args[1]}%${args[0]}`)

        user.updateChallengeCompletions('coinsearned', args[1], args[0])

        this.handler.analytics.transaction(user.data.id, args[0], args[1])
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
