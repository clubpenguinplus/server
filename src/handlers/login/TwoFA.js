import Handler from '../Handler'

export default class TwoFA extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            '2fa': this.allow2FA
        }
    }

    async allow2FA(xmlData, user) {
        let code = xmlData.getElementsByTagName('code')[0].childNodes[0].nodeValue
        let id = xmlData.getElementsByTagName('id')[0].childNodes[0].nodeValue

        let acc = await this.db.getUserById(id)
        if (!acc) {
            return user.sendXml('A#KO')
        }

        let twoFA = await this.db.twoFA.findOne({
            where: {
                userId: acc.id,
                code: code
            }
        })

        if (!twoFA) {
            return user.sendXml('A#KO')
        }

        this.db.twoFA
            .update(
                {
                    isAllowed: 1
                },
                {
                    where: {
                        userId: acc.id,
                        code: code
                    }
                }
            )
            .then(() => {
                user.sendXml('A#OK')
            })
    }
}
