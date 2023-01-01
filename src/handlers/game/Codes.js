import Handler from '../Handler'
import Sequelize from 'sequelize'

const Op = Sequelize.Op

export default class Codes extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
        }
    }

    async checkCode(args) {
        let activeCodes = await this.db.getActiveCodes()
        for (let i = 0; i < activeCodes.length; i++) {
          if (activeCodes[i].code === args) {
            return true
          }
        }
        return false
    }

    async checkCodeUsage(args, user) {
        let usedCodes = await this.db.getUsedCodes(user)
        for (let i = 0; i < usedCodes.length; i++) {
          if (usedCodes[i] === args) {
            return true
          }
        }
        return false
      }
}
