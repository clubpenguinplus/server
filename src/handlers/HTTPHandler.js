import bodyParser from 'body-parser'
export default class HTTPHandler {
    constructor(app, handler, jira) {
        this.jira = jira
        this.handler = handler
        this.app = app
        this.app.use(bodyParser.urlencoded({extended: true}))

        this.postEvents = {
            endgame: this.endGame,
            stampearned: this.stampEarned,
            getpopulation: this.getPopulation,
            getissues: this.getIssues,
            getissue: this.getIssue,
            getissuecomments: this.getIssueComments,
            createissue: this.createIssue,
            panellogin: this.getPanelLogin
        }

        this.getEvents = {
            getpopulation: this.getPopulation,
            panellogin: this.getPanelLogin
        }

        for (let event in this.postEvents) {
            const eventFunction = this.postEvents[event].bind(this)
            this.app.post(`/${event}`, (req, res) => {
                if (Object.keys(req.body)[0]) req.body = JSON.parse(Object.keys(req.body)[0])
                eventFunction(req, res)
            })
        }

        for (let event in this.getEvents) {
            const eventFunction = this.getEvents[event].bind(this)
            this.app.get(`/${event}`, (req, res) => {
                if (Object.keys(req.body)[0]) req.body = JSON.parse(Object.keys(req.body)[0])
                eventFunction(req, res)
            })
        }
    }

    async endGame(req, res) {
        if (req.body.user && this.handler.usersById[req.body.user]) {
            this.handler.usersById[req.body.user].endAS3Game(req.body.auth, req.body.game, req.body.score, req.body.endroom)
        }
        res.send('OK')
    }

    async stampEarned(req, res) {
        if (req.body.user && this.handler.usersById[req.body.user]) {
            this.handler.usersById[req.body.user].stampEarnedAS3(req.body.auth, req.body.stamp)
        }
        res.send('OK')
    }

    async getPopulation(req, res) {
        res.send({population: Object.entries(this.handler.users).length || 0, maxUsers: process.env.maxUsers})
    }

    // Issue tracker

    async getIssues(req, res) {
        // Checks user based on unique session id. Should prevent most abuse
        // If we need to interface with the API outside of the game, we could make a separate API key
        let userId = this.handler.usersBySessionId[req.body.sessionId]
        if (!userId) {
            res.send({error: 'Invalid session id'})
            return
        }

        // Ensures users can only see their own player reports
        if (req.body.type == 'RPT') {
            req.body.reporter = this.handler.usersById[userId].data.id
        }

        let issues = await this.jira.getIssues(req.body.type, req.body.reporter, req.body.limit, req.body.from)
        res.send(issues)
    }

    async getIssue(req, res) {
        let userId = this.handler.usersBySessionId[req.body.sessionId]
        if (!userId) {
            res.send({error: 'Invalid session id'})
            return
        }

        let issue = await this.jira.getIssue(req.body.key, userId)
        res.send(issue)
    }

    async getIssueComments(req, res) {
        let userId = this.handler.usersBySessionId[req.body.sessionId]
        if (!userId) {
            res.send({error: 'Invalid session id'})
            return
        }

        let comments = await this.jira.getIssueComments(req.body.id)
        res.send(comments)
    }

    async createIssue(req, res) {
        let userId = this.handler.usersBySessionId[req.body.sessionId]
        if (!userId) {
            res.send({error: 'Invalid session id'})
            return
        }

        this.jira.createIssue(req.body.type, req.body.title, req.body.body, req.body.version, userId)
    }

    // Panel

    async getPanelLogin(req, res) {
        if (!this.handler.panel) {
            return res.send({error: 'Panel not enabled'})
        }

        this.handler.panel.getLoginPage(req, res)
    }

    async panelLogin(req, res) {
        if (!this.handler.panel) {
            return res.send({error: 'Panel not enabled'})
        }

        this.handler.panel.login(req, res)
    }
}
