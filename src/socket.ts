import net from 'net'
import tls from 'tls'

function Mixin<T> (SuperClass) {
  return (class extends SuperClass {
    private writeReal: Function
    private _writeGeneric: Function

    private last = {
      corked: false,
      data: '',
      encoding: null,
      ready: 0
    }

    protected constructor (...args: any) {
      super(...args)

      this.setNoDelay(true)

      this.writeReal = this._writeGeneric
      this._writeGeneric = this.writePatch
    }

    public async corkLast (wait = true) {
      this.last.corked = true
      if (wait) await this.waitLast()
    }

    public async uncorkLast () {
      this.last.corked = false

      if (this.last.ready < 2) return

      this.writeReal(false, this.last.data, this.last.encoding, () => {
        this.last.data = ''
        this.last.encoding = null
        this.last.ready = 0
        this.emit('lastSent')
      })
    }

    private async waitLast () {
      await new Promise(resolve => this.once('lastReady', resolve))
    }

    private writePatch (
      writev: boolean,
      data: any,
      encoding: string,
      cb: (error?: Error) => void
    ) {
      if (writev) {
        for (const { chunk, encoding: enc, callback } of data) {
          if (!chunk) continue
          this.writePatch(false, chunk, enc, callback)
        }
        return
      }

      if (this.last.corked) {
        if (this.last.ready > 0) {
          this.once('lastSent', () =>
            this.writePatch(writev, data, encoding, cb)
          )
        } else {
          this.last.data = data.slice(-2)
          data = data.slice(0, -2)

          this.last.encoding = encoding

          const cbReal = cb
          cb = (error?: Error) => {
            this.last.ready = 2
            this.emit('lastReady')
            cbReal && cbReal(error)
          }

          this.last.ready = 1
        }
      }

      if (this.connecting) {
        this._pendingData = data
        this._pendingEncoding = encoding
        this.once('connect', () => this.writeReal(writev, data, encoding, cb))
      } else {
        return this.writeReal(writev, data, encoding, cb)
      }
    }
  } as any) as T
}

class $TLSSocket extends tls.TLSSocket {
  public async corkLast (wait = true) {}
  public async uncorkLast () {}
}

export class TLSSocket extends Mixin<typeof $TLSSocket>(tls.TLSSocket) {}

class $Socket extends net.Socket {
  public async corkLast (wait = true) {}
  public async uncorkLast () {}
}

export class Socket extends Mixin<typeof $Socket>(net.Socket) {}
