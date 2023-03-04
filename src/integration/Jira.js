import JiraApi from 'jira-client'

export default class Jira {
    constructor(server) {
        this.handler = server.handler
        this.jira = new JiraApi({
            protocol: 'https',
            host: 'clubpenguinplus.atlassian.net',
            username: process.env.jiraUsername,
            password: process.env.jiraAPIToken,
            apiVersion: '2',
            strictSSL: true,
        })
    }

    issueToJSON(issue) {
        let reporter
        if (issue.fields.description.includes('Reporter = ')) {
            reporter = issue.fields.description.split('Reporter = ')[1]
            issue.fields.description = issue.fields.description.split('Reporter = ')[0].trimRight('\n')
        } else {
            reporter = issue.fields.reporter.displayName
        }

        let resolution
        if (issue.fields.resolution == null) {
            resolution = 'Unresolved'
        } else {
            resolution = issue.fields.resolution.name
        }

        return {
            id: issue.id,
            key: issue.key,
            title: issue.fields.summary,
            reporter: reporter,
            description: issue.fields.description,
            status: issue.fields.status.name,
            fixVersions: issue.fields.fixVersions,
            resolution: resolution,
            priority: issue.fields.priority.name,
        }
    }

    async getIssues(type, reporter, limit = 5, from = 0) {
        try {
            if (reporter == 'all') {
                const results = await this.jira.searchJira(`project = ${type}`, {startAt: from, maxResults: limit})
                const issues = results.issues.map((issue) => {
                    return this.issueToJSON(issue)
                })
                return issues
            } else {
                const results = await this.jira.searchJira(`project = ${type} AND text ~ "Reporter = ${reporter}"`, {startAt: from, maxResults: limit})
                const issues = issues.issues.map((issue) => {
                    return this.issueToJSON(issue)
                })
                return issues
            }
        } catch (error) {
            this.handler.log.error(`[Jira]: ${error}`)
        }
        return {}
    }

    async createIssue() {}
}
