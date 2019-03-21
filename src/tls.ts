import net from 'net'
import tls from 'tls'
import { TLSSocket } from './socket'

export * from 'tls'

export { TLSSocket }

const kConnectOptions = Symbol('connect-options')

export function connect (...args) {
  args = normalizeConnectArgs(args)
  let options = args[0]
  const cb = args[1]
  const allowUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'

  options = {
    rejectUnauthorized: !allowUnauthorized,
    ciphers: (tls as any).DEFAULT_CIPHERS,
    checkServerIdentity: tls.checkServerIdentity,
    minDHSize: 1024,
    ...options
  }

  if (!options.keepAlive) options.singleUse = true

  const context = options.secureContext || tls.createSecureContext(options)

  const tlssock = new TLSSocket(options.socket, {
    pipe: !!options.path,
    secureContext: context,
    isServer: false,
    requestCert: true,
    rejectUnauthorized: options.rejectUnauthorized !== false,
    session: options.session,
    ALPNProtocols: options.ALPNProtocols,
    requestOCSP: options.requestOCSP
  } as any) as any

  tlssock[kConnectOptions] = options

  if (cb) tlssock.once('secureConnect', cb)

  if (!options.socket) {
    // If user provided the socket, its their responsibility to manage its
    // connectivity. If we created one internally, we connect it.
    const connectOpt = {
      path: options.path,
      port: options.port,
      host: options.host,
      family: options.family,
      localAddress: options.localAddress,
      localPort: options.localPort,
      lookup: options.lookup
    }

    if (options.timeout) {
      tlssock.setTimeout(options.timeout)
    }

    tlssock.connect(connectOpt, tlssock._start)
  }

  tlssock._releaseControl()

  if (options.session) tlssock.setSession(options.session)

  if (options.servername) tlssock.setServername(options.servername)

  if (options.socket) tlssock._start()

  tlssock.on('secure', onConnectSecure)
  tlssock.once('end', onConnectEnd)

  return tlssock
}

function onConnectSecure (this: any) {
  const options = this[kConnectOptions]

  // Check the size of DHE parameter above minimum requirement
  // specified in options.
  const ekeyinfo = this.getEphemeralKeyInfo()
  if (ekeyinfo.type === 'DH' && ekeyinfo.size < options.minDHSize) {
    const err = new Error('ERR_TLS_DH_PARAM_SIZE') // new ERR_TLS_DH_PARAM_SIZE(ekeyinfo.size)
    this.emit('error', err)
    this.destroy()
    return
  }

  let verifyError = this._handle.verifyError()

  // Verify that server's identity matches it's certificate's names
  // Unless server has resumed our existing session
  if (!verifyError && !this.isSessionReused()) {
    const hostname =
      options.servername ||
      options.host ||
      (options.socket && options.socket._host) ||
      'localhost'
    const cert = this.getPeerCertificate(true)
    verifyError = options.checkServerIdentity(hostname, cert)
  }

  if (verifyError) {
    this.authorized = false
    this.authorizationError = verifyError.code || verifyError.message

    if (options.rejectUnauthorized) {
      this.destroy(verifyError)
      return
    } else {
      this.emit('secureConnect')
    }
  } else {
    this.authorized = true
    this.emit('secureConnect')
  }

  this.removeListener('end', onConnectEnd)
}

function onConnectEnd (this: any) {
  // NOTE: This logic is shared with _http_client.js
  if (!this._hadError) {
    const options = this[kConnectOptions]
    this._hadError = true
    // eslint-disable-next-line no-restricted-syntax
    const error: any = new Error(
      'Client network socket disconnected before ' +
        'secure TLS connection was established'
    )
    error.code = 'ECONNRESET'
    error.path = options.path
    error.host = options.host
    error.port = options.port
    error.localAddress = options.localAddress
    this.destroy(error)
  }
}

function normalizeConnectArgs (listArgs) {
  const args = (net as any)._normalizeArgs(listArgs)
  const options = args[0]
  const cb = args[1]

  // If args[0] was options, then normalize dealt with it.
  // If args[0] is port, or args[0], args[1] is host, port, we need to
  // find the options and merge them in, normalize's options has only
  // the host/port/path args that it knows about, not the tls options.
  // This means that options.host overrides a host arg.
  if (listArgs[1] !== null && typeof listArgs[1] === 'object') {
    Object.assign(options, listArgs[1])
  } else if (listArgs[2] !== null && typeof listArgs[2] === 'object') {
    Object.assign(options, listArgs[2])
  }

  return cb ? [options, cb] : [options]
}
