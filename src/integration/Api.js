import axios from 'axios'

export default class Api {
    constructor(handler) {
        this.handler = handler

        this.api = axios.create({
            baseURL: process.env.apiBaseURL,
            timeout: 10000,
        })

        this.apiKey = process.env.apiKey
        this.checkApiKey()
    }

    async checkApiKey() {
        if ((await this.apiFunction('/', {})) !== 'OK') {
            this.handler.log.error('Invalid API key')
            process.exit(1)
        }
    }

    async apiFunction(url, data) {
        data.apikey = this.apiKey
        return await this.api
            .post(url, data)
            .then(async function (response) {
                return response.data
            })
            .catch((error) => {
                this.handler.log.error(`[API]: ${error}`)
            })
    }
}
