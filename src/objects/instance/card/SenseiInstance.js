import CardInstance from './CardInstance'

import SenseiNinja from './ninja/SenseiNinja'

export default class SenseiInstance extends CardInstance {
    constructor(user) {
        super({users: [user]})

        this.user = user

        this.senseiData = {
            username: 'Sensei',
            color: 14,
            ninjaRank: 10,
            sensei: true
        }

        this.sensei
        this.me
    }

    init() {
        super.init()

        this.sensei = new SenseiNinja()
        this.me = this.ninjas[this.user.id]

        this.sensei.opponent = this.me
        this.me.opponent = this.sensei
    }

    start() {
        let users = [
            this.senseiData,
            {
                username: this.user.data.username,
                color: this.user.data.color,
                ninjaRank: this.user.data.ninjaRank
            }
        ]

        this.send('start_game', {users: users})

        this.started = true
    }

    handleStartGame() {
        this.start()
    }

    handleSendDeal(args, user) {
        if (this.me.hasDealt) return

        let canBeatSensei = user.ninjaRank >= this.awards.length - 1

        let cards = this.me.dealCards(canBeatSensei)
        let senseiCards = this.sensei.dealCards(cards, canBeatSensei)

        user.sendXt('send_deal', JSON.stringify({cards: cards}))
        user.sendXt('send_opponent_deal', JSON.stringify({deal: senseiCards.length}))
    }

    handlePickCard(args, user) {
        args = JSON.parse(args)
        if (!this.me.isInDealt(args.card) || this.me.pick) return

        this.me.pickCard(args.card)
        this.sensei.pickCard(args.card)

        this.me.revealCards()
        this.judgeRound(this.me)
    }

    updateProgress(user, won) {
        if (!user) return

        if (this.checkBlackBeltWin(user, won)) {
            user.update({ninjaProgress: 100})
        }

        super.updateProgress(user, won)
    }

    checkBlackBeltWin(user, won) {
        return user.ninjaRank == 9 && won
    }

    getNinja(seat) {
        return [this.sensei, this.me][seat]
    }
}
