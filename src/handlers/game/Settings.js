import Handler from '../Handler'
import bcrypt from 'bcrypt'

export default class Settings extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'sett#getsettings': this.getSettingsInfo,
            'sett#enable2fa': this.enable2FA,
            'sett#disable2fa': this.disable2FA,
            'sett#changepass': this.changePassword,
        }
    }

    maskEmail(email) {
        // Split the email address into username and domain parts
        var parts = email.split('@')
        var username = parts[0] || ''
        var domain = parts[1] || ''

        // Replace characters in the username with asterisks, except the first letter
        var maskedUsername = username.charAt(0) + username.slice(1).replace(/./g, '*')

        // Split the domain into domain name and TLD parts
        var domainParts = domain.split('.')
        var domainName = domainParts.slice(0, -1).join('.')
        var tld = domainParts[domainParts.length - 1]

        // Replace characters in the domain name with asterisks, except the first letter
        var maskedDomainName = domainName.charAt(0) + domainName.slice(1).replace(/./g, '*')

        // Combine the masked username, masked domain name, and TLD to form the masked email
        var maskedEmail = maskedUsername + '@' + maskedDomainName + '.' + tld

        return maskedEmail
    }

    async getSettingsInfo(args, user) {
        let settings = await this.db.getUserById(user.data.id)
        let id = user.data.id
        let username = user.data.username
        let email = this.maskEmail(settings.dataValues.email || '')
        let age = settings.dataValues.over13 ? 1 : 0
        let mfa = settings.dataValues.has2FA ? 1 : 0

        // TODO: Parental controls
        let forceChatTier = /* settings.dataValues.forceChat */ 0
        let playtimeLimit = /* settings.dataValues.playtimeLimit */ 0
        let infractionNotifications = /* settings.dataValues.infractionNotifications */ 0

        user.sendXt('gsi', `${id}%${username}%${email}%${age}%${forceChatTier}%${playtimeLimit}%${infractionNotifications}%${mfa}`)
    }

    async enable2FA(args, user) {
        user.update({has2FA: true})
    }

    async disable2FA(args, user) {
        user.update({has2FA: false})
    }

    async changePassword(args, user) {
        let oldPassword = args[0]
        let newPassword = args[1]

        if (!oldPassword || !newPassword) {
            return user.sendXt('e', '29')
        }

        if (bcrypt.compareSync(oldPassword, user.data.password)) {
            user.update({password: bcrypt.hashSync(newPassword, parseInt(process.env.cryptoRounds))})
            this.db.authTokens.destroy({where: {userId: user.data.id}})
            user.sendXt('passchng')
        } else {
            user.sendXt('e', '29')
        }
    }
}
