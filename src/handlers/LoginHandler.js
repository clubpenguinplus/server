import Email from '../integration/Email'
import Panel from '../integration/Panel'
import BaseHandler from './BaseHandler'

const jsdom = require('jsdom')

/**
 * Dedicated login server handler that validates user credentials.
 */
export default class LoginHandler extends BaseHandler {
    constructor(id, users, db, log) {
        super(id, users, db, log)
        this.email = new Email(this)
        this.panel = new Panel(this)

        this.dir = `${__dirname}/login`

        this.crumbs = {
            worlds: this.getCrumb('worlds'),
            challenges: this.getCrumb('challenges')
        }

        this.updateWeeklyChallenges()

        this.loadHandlers()

        this.log.info(`[${this.id}] Created LoginHandler for server: ${this.id}`)
    }

    handle(message, user) {
        let xml = new jsdom.JSDOM(message)
        xml = xml.window.document
        try {
            this.events.emit(xml.getElementsByTagName('body')[0].getAttribute('action'), xml, user)
        } catch (error) {
            this.log.error(`[${this.id}] Error: ${error}`)
        }
    }

    close(user) {
        try {
            delete this.users[user.socket.id]
        } catch (error) {
            this.log.error(`[${this.id}] Error: ${error}`)
        }
    }

    get dateInPST() {
        // The offset from UTC to PST is -8 hours. If we run getUTCx() on this date, we get the correct time in PST.
        return new Date(Date.now() - 8 * 60 * 60 * 1000).getTime()
    }

    get weekDayInPST() {
        return new Date(Date.now() - 8 * 60 * 60 * 1000).getUTCDay()
    }

    get dayInPST() {
        return new Date(Date.now() - 8 * 60 * 60 * 1000).getUTCDate()
    }

    get monthInPST() {
        return new Date(Date.now() - 8 * 60 * 60 * 1000).getUTCMonth()
    }

    get yearInPST() {
        return new Date(Date.now() - 8 * 60 * 60 * 1000).getUTCFullYear()
    }

    get distanceToMidnight() {
        let midnight = new Date(this.yearInPST, this.monthInPST, this.dayInPST + 1).getTime()
        let now = this.dateInPST
        return midnight - now
    }

    get distanceToNextMonday() {
        let day = this.weekDayInPST
        let distanceToMonday = day == 0 ? 0 : 7 - day
        let distanceToNextMonday = distanceToMonday * 24 * 60 * 60 * 1000 + this.distanceToMidnight
        return distanceToNextMonday
    }

    async updateWeeklyChallenges() {
        setTimeout(() => {
            this.setWeeklyChallenges()
            setInterval(
                () => {
                    this.setWeeklyChallenges()
                },
                7 * 24 * 60 * 60 * 1000
            )
        }, this.distanceToNextMonday)

        this.log.info(`Next weekly challenges in ${this.distanceToNextMonday / 1000 / 60 / 60} hours.`)

        let currentChallenges = await this.db.getGlobalChallenges()
        if (currentChallenges.length == 0) {
            this.setWeeklyChallenges()
        }
    }

    async setWeeklyChallenges() {
        let possible = Object.keys(this.crumbs.challenges.global)
        let challenge1 = possible[Math.floor(Math.random() * possible.length)]
        let challenge2 = possible[Math.floor(Math.random() * possible.length)]
        while (challenge2 == challenge1) {
            challenge2 = possible[Math.floor(Math.random() * possible.length)]
        }
        this.log.info(`Setting weekly challenges: ${challenge1}, ${challenge2}`)
        this.db.setGlobalChallenge(challenge1, Date.now() + this.distanceToNextMonday)
        this.db.setGlobalChallenge(challenge2, Date.now() + this.distanceToNextMonday)
    }
}
