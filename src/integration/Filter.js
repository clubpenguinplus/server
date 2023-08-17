const fs = require('fs')
import words from 'profane-words'

export default class Filter {
    constructor(handler) {
        this.handler = handler

        const en = fs.readFileSync('./filterlist/en.txt', {encoding: 'utf8', flag: 'r'})

        const delimiter = process.platform == 'win32' ? '\r\n' : '\n'
        this.wordlist = en.split(delimiter)

        this.handler.log.info(`[Filter] Loaded ${this.wordlist.length} words.`)
    }

    checkWhitelistFilter(message) {
        message = message.toLowerCase().split(' ')
        let contains = false
        let offendingWord = ''
        for (let word of message) {
            if (this.wordlist.indexOf(word.replace(/[.!?#,:;'"-]/g, '')) == -1) {
                contains = true
                offendingWord = word
                break
            }
        }
        if (contains) return offendingWord
        return false
    }

    checkBlacklistFilter(message) {
        message = message.toLowerCase().split(' ')
        let contains = false
        let offendingWord = ''
        for (let word of message) {
            if (words.includes(word.replace(/[.!?#,:;'"-]/g, ''))) {
                contains = true
                offendingWord = word
                break
            }
        }
        if (contains) return offendingWord
        return false
    }
}
