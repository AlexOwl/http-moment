import { HttpsAgent } from './agent'

export * from 'https'

const globalAgent = new HttpsAgent()

export { HttpsAgent as Agent, globalAgent }
