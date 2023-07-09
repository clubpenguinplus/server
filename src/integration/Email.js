const sgMail = require('@sendgrid/mail')

export default class Email {
    constructor(handler) {
        this.handler = handler
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    }

    async send(to, subject, template, replacers = []) {
        replacers.forEach((replacer) => {
            template = template.replaceAll(replacer[0], replacer[1])
        })

        const email = {
            to: to,
            from: {
                email: 'no-reply@clubpenguin.plus',
                name: 'Club Penguin Plus'
            },
            subject: subject,
            html: template
        }

        sgMail
            .send(email)
            .catch((error) => {
                this.handler.log.error(`[Email]: ${error}`)
            })
            .then(
                () => {
                    return true
                },
                () => {
                    return false
                }
            )
    }
}
