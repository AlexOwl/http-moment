import net from 'net'
import { Socket } from './socket'

export * from 'net'

export { Socket }

export function connect (...args) {
  const normalized = (net as any)._normalizeArgs(args)
  const options = normalized[0]

  const socket = new Socket(options)

  if (options.timeout) socket.setTimeout(options.timeout)

  return socket.connect(normalized)
}
