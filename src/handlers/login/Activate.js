import Handler from '../Handler'

export default class Activate extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            activate: this.activate,
            register: this.register
        }
    }

    async activate(xmlData, user) {
        let email = xmlData.getElementsByTagName('email')[0].childNodes[0].nodeValue
        let activationKey = xmlData.getElementsByTagName('key')[0].childNodes[0].nodeValue

        let acc = await this.db.getUserByEmail(email)
        if (!acc) {
            return user.sendXml('A#KO')
        }

        if (acc.emailActivated) {
            return user.sendXml('A#OK')
        }

        if (acc.activationKey != activationKey) {
            return user.sendXml('A#KO')
        }

        this.db.users.update({emailActivated: true}, {where: {id: acc.id}}).then(() => {
            user.sendXml('A#OK')
        })
    }

    async register(xmlData, user) {
        let username = xmlData.getElementsByTagName('username')[0].childNodes[0].nodeValue
        let betaKey = xmlData.getElementsByTagName('key')[0].childNodes[0].nodeValue

        let acc = await this.db.getUserByUsername(username)
        if (!acc) {
            return user.sendXml('B#KO')
        }

        if (acc.rank >= 3) {
            return user.sendXml('B#KO')
        }

        let bk = await this.db.findOne('betaKeys', {where: {key: betaKey}})
        if (!bk) {
            return user.sendXml('B#KO')
        }

        this.db.users.update({rank: 2}, {where: {id: acc.id}}).then(() => {
            this.db.betaKeys.destroy({where: {key: betaKey}})
            user.sendXml('B#OK')
        })
    }
}
