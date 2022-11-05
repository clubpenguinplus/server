import WaddleInstance from './WaddleInstance'

export default class FindFourInstance extends WaddleInstance {
    constructor(waddle) {
        super(waddle)
        this.waddle = waddle
        this.game = 'four'
    }

    // Functions

    init() {
        this.map = [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
        ]
        this.turn = this.users[0].data.id
        this.sendXt('iff', `${this.users[0].data.id},${this.users[1].data.id}%${this.turn}`)

        super.gameReady()
        super.init()
    }

    async placeCounter(args, user) {
        if (this.turn !== user.data.id) return
        this.map[args[0]][args[1]] = user.data.id
        this.sendXt('pc', `${args[0]}%${args[1]}%${user.data.id}`)

        let verticalMatch = this.checkVerticalMatch(args[0], user.data.id)
        let horizontalMatch = this.checkHorizontalMatch(args[1], user.data.id)
        let diagonalMatch = this.checkDiagonalMatch(args[0], args[1], user.data.id)

        if (verticalMatch || horizontalMatch || diagonalMatch) {
            let winner = user.data.id
            this.sendXt('eff', winner)
            user.data.findFourWon = user.data.findFourWon + 1
            user.update({
                findFourWon: user.data.findFourWon,
            })
            for (let x in this.users) {
                if (this.users[x].data.id === winner) {
                    this.users[x].updateCoins(25)
                    this.users[x].sendXt('eg', `${this.users[x].data.coins}%four%25`)
                } else {
                    this.users[x].updateCoins(10)
                    this.users[x].sendXt('eg', `${this.users[x].data.coins}%four%10`)
                }
                this.waddle.remove(this.users[x])
            }
            this.waddle.reset()
        } else {
            this.tied = true
            for (var column in this.map) {
                for (var row in this.map[column]) {
                    if (this.map[column][row] === 0) {
                        this.tied = false
                    }
                }
            }
            if (this.tied) {
                this.sendXt('eff', 0)
                for (let x in this.users) {
                    this.users[x].updateCoins(10)
                    this.users[x].sendXt('eg', `${this.users[x].data.coins}%four%10`)
                    this.waddle.remove(this.users[x])
                }
                this.waddle.reset()
            }
            if (this.turn === this.users[0].data.id) {
                this.turn = this.users[1].data.id
            } else {
                this.turn = this.users[0].data.id
            }
            this.sendXt('ct', this.turn)
        }
    }

    checkVerticalMatch(column, user) {
        let adjacent = 0
        for (let row = 0; row < 7; row++) {
            if (this.map[column][row] === user) {
                adjacent = adjacent + 1
            }
            if (adjacent >= 4) return true
            if (this.map[column][row] !== user) {
                adjacent = 0
            }
        }
    }

    checkHorizontalMatch(row, user) {
        let adjacent = 0
        for (let column = 0; column < 7; column++) {
            if (this.map[column][row] === user) {
                adjacent = adjacent + 1
            }
            if (adjacent >= 4) return true
            if (this.map[column][row] !== user) {
                adjacent = 0
            }
        }
    }

    checkDiagonalMatch(column, row, user) {
        let adjacent = 0
        for (let i = -7; i < 7; i++) {
            if (!this.map[column + i]) {
                adjacent = 0
                continue
            }
            if (!this.map[column + i][row - i]) {
                adjacent = 0
                continue
            }
            if (this.map[column + i][row - i] === user) {
                adjacent = adjacent + 1
            }
            if (adjacent >= 4) return true
            if (this.map[column + i][row - i] !== user) {
                adjacent = 0
            }
        }
        for (let i = -7; i < 7; i++) {
            if (!this.map[column - i]) {
                adjacent = 0
                continue
            }
            if (!this.map[column - i][row - i]) {
                adjacent = 0
                continue
            }
            if (this.map[column - i][row - i] === user) {
                adjacent = adjacent + 1
            }
            if (adjacent >= 4) return true
            if (this.map[column - i][row - i] !== user) {
                adjacent = 0
            }
        }
    }

    remove(user) {
        let winner = this.users[0].data.id === user.data.id ? this.users[1] : this.users[0]

        this.sendXt('eff', winner.data.id)

        for (let x in this.users) {
            this.users[x].sendXt('eg', `${this.users[x].data.coins}%four%0`)
            this.waddle.remove(this.users[x])
        }
        this.waddle.reset()
    }
}
