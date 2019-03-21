import { HttpAgent } from './agent'

export * from 'http'

const globalAgent = new HttpAgent()

export { HttpAgent as Agent, globalAgent }
