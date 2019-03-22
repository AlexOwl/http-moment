import { EventEmitter } from 'events'
import http from 'http'
import https from 'https'

import * as net from './net'
import * as tls from './tls'

function Mixin<T> (SuperClass) {
  return (class extends SuperClass {
    protected isHttpsAgent = false

    private corked = false
    private emitter = new EventEmitter()

    private socketsReady = []

    protected constructor (...args: any) {
      super(...args)

      this.emitter.on('lastReady', socket => {
        this.socketsReady.push(socket)
        this.emitter.emit('socketReady', socket)
      })
    }

    public async cork (count = 0) {
      if (this.corked) return
      this.corked = true

      if (count < 1) return

      await new Promise(resolve => {
        const handler = () => {
          if (this.socketsReady.length < count) return
          this.emitter.off('socketReady', handler)
          resolve()
        }
        this.emitter.on('socketReady', handler)
      })

      await this.uncork()
    }

    public async uncork () {
      if (!this.corked) return
      this.corked = false

      setImmediate(() => {
        this.socketsReady.forEach(socket => socket.uncorkLast())
        this.socketsReady.splice(0)
      })
    }

    protected createConnection (port: any, host: any, options: any) {
      if (port !== null && typeof port === 'object') {
        return this.createConnection(null, null, port)
      }
      if (host !== null && typeof host === 'object') {
        return this.createConnection(port, null, host)
      }

      options = { ...options }

      if (typeof port === 'number') options.port = port

      if (typeof host === 'string') options.host = host

      if (typeof options.ip === 'string') options.host = options.ip

      const socket = this.isHttpsAgent
        ? tls.connect(options)
        : net.connect(options)

      if (this.corked) {
        socket.corkLast().then(() => this.emitter.emit('lastReady', socket))
      }

      return socket
    }
  } as any) as T
}

class $HttpAgent extends http.Agent {
  public async cork (count = 0) {}
  public async uncork () {}
}

export class HttpAgent extends Mixin<typeof $HttpAgent>(http.Agent) {}

class $HttpsAgent extends https.Agent {
  public async cork (count = 0) {}
  public async uncork () {}
}

export class HttpsAgent extends Mixin<typeof $HttpsAgent>(https.Agent) {
  protected isHttpsAgent = true
}
