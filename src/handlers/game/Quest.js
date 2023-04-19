import Handler from '../Handler'

export default class Quest extends Handler {
    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'q#gc': this.getQuestCompletion,
            'q#sc': this.setQuestCompletion,
            'q#gp': this.getQuestProgress,
        }

        this.handler.partyData.party = null
    }

    async getQuestCompletion(args, user, allowDelegate = true) {
        let questId = args[0]
        if (this[`getQuest${questId}Completion`] && allowDelegate) return this[`getQuest${questId}Completion`](args, user)
        let quest = await this.db.getQuestCompletion(user.data.id, questId)
        if (!quest) {
            return user.sendXt('qgc', `${questId}%0`)
        }
        user.sendXt('qgc', `${questId}%${quest.completion}`)
    }

    setQuestCompletion(args, user, allowDelegate = true) {
        let questId = args[0]
        if (this[`setQuest${questId}Completion`] && allowDelegate) return this[`setQuest${questId}Completion`](args, user)
        let completion = args[1]
        let info = args[2] || null
        this.db.setQuestCompletion(user.data.id, questId, completion, info)
    }

    getQuestProgress(args, user) {
        // For quests that require multiple steps to advance to the next completion, we use a custom function to handle the progress

        let questId = args[0]
        if (this[`getQuest${questId}Progress`]) this[`getQuest${questId}Progress`](args, user)
    }

    // Rainbow Quest

    async setQuest4Completion(args, user) {
        let quest = await this.db.getQuestCompletion(user.data.id, 4)
        if (!quest) {
            if (args[1] != 1) return
            this.setQuestCompletion([4, 1, Date.now().toString()], user, false)

            setTimeout(() => {
                this.setQuestCompletion([4, 2], user, false)
            }, 1200000)
            return
        }

        if (quest.completion != (parseInt(args[1]) - 1) * 2) return

        this.setQuestCompletion([4, parseInt(args[1]) * 2 - 1, Date.now().toString()], user, false)
        setTimeout(() => {
            this.setQuestCompletion([4, parseInt(args[1]) * 2], user, false)
        }, 1200000)
    }

    async getQuest4Completion(args, user) {
        let quest = await this.db.getQuestCompletion(user.data.id, 4)
        if (!quest) {
            return user.sendXt('qgc', '4%0')
        }
        if (quest.completion % 2 != 0) {
            if (Date.now() - parseInt(quest.info) > 1200000) {
                this.setQuestCompletion([4, quest.completion + 1], user, false)
                return user.sendXt('qgc', `4%${quest.completion + 1}`)
            }
        }
        user.sendXt('qgc', `4%${quest.completion}`)
    }

    async getQuest4Progress(args, user) {
        let quest = await this.db.getQuestCompletion(user.data.id, 4)
        if (!quest) {
            return
        }

        let progress = Math.floor((Date.now() - parseInt(quest.info)) / 60000)

        user.sendXt('qgp', `4%${progress}`)
    }
}
