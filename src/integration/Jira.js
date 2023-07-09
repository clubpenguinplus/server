import {query} from 'express'
import JiraApi from 'jira-client'

export default class Jira {
    constructor(server) {
        this.handler = server.handler

        const refreshJira = () => {
            this.jira = new JiraApi({
                protocol: 'https',
                host: 'clubpenguinplus.atlassian.net',
                username: process.env.jiraUsername,
                password: process.env.jiraAPIToken,
                apiVersion: '2',
                strictSSL: true,
            })
            setTimeout(() => refreshJira(), 1000 * 60) // Refreshes the Jira API instance every minute
        }
        refreshJira()
    }

    async issueToJSON(issue) {
        let reporter
        if (issue.fields.description && issue.fields.description.includes('Reporter = ')) {
            let userId = issue.fields.description.split('Reporter = ')[1]
            let user = await this.handler.db.getUserById(userId)
            reporter = user ? user.dataValues.username : 'Unknown'
            issue.fields.description = issue.fields.description.split('Reporter = ')[0].trimRight('\n')
        } else {
            reporter = issue.fields.reporter.displayName
        }

        let resolution
        if (!issue.fields.resolution) {
            resolution = issue.fields.status.name
        } else {
            resolution = issue.fields.resolution.name
        }

        let fixVersion
        if (issue.fields.fixVersions.length == 0) {
            fixVersion = 'None'
        } else {
            fixVersion = issue.fields.fixVersions[issue.fields.fixVersions.length - 1].name
        }

        let affectsVersion
        if (issue.fields.versions.length == 0) {
            affectsVersion = 'Unspecified'
        } else {
            affectsVersion = issue.fields.versions[issue.fields.versions.length - 1].name
        }

        let assignee
        if (!issue.fields.assignee) {
            assignee = 'Unassigned'
        } else {
            assignee = issue.fields.assignee.displayName
        }

        let duplicates = 'None'
        if (issue.fields.issuelinks) {
            for (let i = 0; i < issue.fields.issuelinks.length; i++) {
                if (issue.fields.issuelinks[i].type.name == 'Duplicate' && issue.fields.issuelinks[i].outwardIssue) {
                    duplicates = issue.fields.issuelinks[i].outwardIssue.key
                    break
                }
            }
        }

        return {
            id: issue.id,
            key: issue.key,
            title: issue.fields.summary,
            reporter: reporter,
            description: issue.fields.description,
            fixVersion: fixVersion,
            affectsVersion: affectsVersion,
            assignee: assignee,
            resolution: resolution,
            priority: issue.fields.priority.name,
            created: issue.fields.created,
            updated: issue.fields.updated,
            duplicates: duplicates,
        }
    }

    async getIssues(type, reporter, limit = 5, from = 0, showResolved = false) {
        // Checks the user is not trying to get issues from a project they shouldn't have access to
        if (!['BUG', 'SGN', 'RPT'].includes(type)) return []

        try {
            let query = `project = ${type}`
            if (reporter != 'all') query += ` AND text ~ "Reporter = ${reporter}"` // We mark the reporter in the description so we can search for it later
            if (!showResolved) query += ` AND status != Closed`
            const results = await this.jira.searchJira(query, {startAt: from, maxResults: limit})
            let issues = []
            for (let i = 0; i < results.issues.length; i++) {
                issues.push(await this.issueToJSON(results.issues[i]))
            }
            return issues
        } catch (error) {
            this.handler.log.error(`[Jira]: ${error}`)
        }
        return []
    }

    async getIssue(key, userId) {
        // Checks the user is not trying to get issues from a project they shouldn't have access to
        if (!key.includes('BUG') && !key.includes('SGN') && !key.includes('RPT')) return {}

        try {
            const issue = await this.jira.getIssue(key)
            if (key.includes('RPT')) {
                // Checks the user isn't trying to get a report they don't have access to
                if (issue.fields.description.includes('Reporter = ')) {
                    let reporter = issue.fields.description.split('Reporter = ')[1]
                    if (reporter != userId) return {}
                }
            }
            return await this.issueToJSON(issue)
        } catch (error) {
            this.handler.log.error(`[Jira]: ${error}`)
        }
    }

    async getIssueComments(issue) {
        try {
            const comments = await this.jira.getComments(issue)
            return comments.comments.map((comment) => {
                return {
                    author: comment.author.displayName,
                    body: comment.body,
                    created: comment.created,
                    updated: comment.updated,
                }
            })
        } catch (error) {
            this.handler.log.error(`[Jira]: ${error}`)
        }
        return []
    }

    async createIssue(type, summary, description, version, reporter) {
        // Checks the user is not trying to create an issue in a project they shouldn't have access to
        if (!['BUG', 'SGN', 'RPT'].includes(type)) return

        const issueTypes = {
            BUG: 'Bug',
            SGN: 'New Feature',
            RPT: 'Task',
        }

        try {
            let fields = {
                project: {
                    key: type,
                },
                summary: summary,
                description: description + `\n\nReporter = ${reporter}`,
                issuetype: {
                    name: issueTypes[type],
                },
            }

            if (type == 'BUG') {
                const versions = await this.jira.getVersions(type)
                if (!versions.some((v) => v.name == version)) {
                    await this.jira.createVersion({
                        project: type,
                        name: version,
                        description: 'Automatically created by a player-submitted issue',
                        released: true,
                        releaseDate: new Date().toISOString().split('T')[0],
                    })
                }
                fields.versions = [{name: version}]
            }
            const issue = await this.jira.addNewIssue({
                fields: fields,
            })
            return issue.key
        } catch (error) {
            this.handler.log.error(`[Jira]: ${error}`)
        }
    }
}
