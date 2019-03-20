/* global fetch URL */
import 'core-js/modules/es6.object.assign'
import { unpromiser, retry, warn } from './utils'
import { LocalStorage, MemoryStorage } from './auth_storage'
import * as auth from './auth_v3'
import * as data from './data'
import * as cozyFetch from './fetch'
import * as mango from './mango'
import * as files from './files'
import * as intents from './intents/'
import * as jobs from './jobs'
import * as offline from './offline'
import * as settings from './settings'
import * as relations from './relations'

const {
  AppToken: AppTokenV3,
  AccessToken: AccessTokenV3,
  Client: ClientV3
} = auth

const AuthNone = 0
const AuthRunning = 1
const AuthError = 2
const AuthOK = 3

const defaultClientParams = {
  softwareID: 'github.com/cozy/cozy-client-js'
}

const dataProto = {
  create: data.create,
  find: data.find,
  findMany: data.findMany,
  findAll: data.findAll,
  update: data.update,
  delete: data._delete,
  updateAttributes: data.updateAttributes,
  changesFeed: data.changesFeed,
  defineIndex: mango.defineIndex,
  query: mango.query,
  addReferencedFiles: relations.addReferencedFiles,
  removeReferencedFiles: relations.removeReferencedFiles,
  listReferencedFiles: relations.listReferencedFiles,
  fetchReferencedFiles: relations.fetchReferencedFiles,
  destroy: function(...args) {
    warn('destroy is deprecated, use cozy.data.delete instead.')
    return data._delete(...args)
  }
}

const authProto = {
  client: auth.client,
  registerClient: auth.registerClient,
  updateClient: auth.updateClient,
  unregisterClient: auth.unregisterClient,
  getClient: auth.getClient,
  getAuthCodeURL: auth.getAuthCodeURL,
  getAccessToken: auth.getAccessToken,
  refreshToken: auth.refreshToken
}

const filesProto = {
  create: files.create,
  createDirectory: files.createDirectory,
  createDirectoryByPath: files.createDirectoryByPath,
  updateById: files.updateById,
  updateAttributesById: files.updateAttributesById,
  updateAttributesByPath: files.updateAttributesByPath,
  trashById: files.trashById,
  statById: files.statById,
  statByPath: files.statByPath,
  downloadById: files.downloadById,
  downloadByPath: files.downloadByPath,
  getDownloadLinkById: files.getDownloadLinkById,
  getDownloadLink: files.getDownloadLinkByPath, // DEPRECATED, should be removed very soon
  getDownloadLinkByPath: files.getDownloadLinkByPath,
  getArchiveLink: function(...args) {
    warn(
      'getArchiveLink is deprecated, use cozy.files.getArchiveLinkByPaths instead.'
    )
    return files.getArchiveLinkByPaths(...args)
  },
  getArchiveLinkByPaths: files.getArchiveLinkByPaths,
  getArchiveLinkByIds: files.getArchiveLinkByIds,
  getFilePath: files.getFilePath,
  getCollectionShareLink: files.getCollectionShareLink,
  query: mango.queryFiles,
  listTrash: files.listTrash,
  clearTrash: files.clearTrash,
  restoreById: files.restoreById,
  destroyById: files.destroyById
}

const intentsProto = {
  create: intents.create,
  createService: intents.createService,
  getRedirectionURL: intents.getRedirectionURL,
  redirect: intents.redirect
}

const jobsProto = {
  create: jobs.create,
  count: jobs.count,
  queued: jobs.queued
}

const offlineProto = {
  init: offline.init,
  getDoctypes: offline.getDoctypes,
  // database
  hasDatabase: offline.hasDatabase,
  getDatabase: offline.getDatabase,
  createDatabase: offline.createDatabase,
  migrateDatabase: offline.migrateDatabase,
  destroyDatabase: offline.destroyDatabase,
  destroyAllDatabase: offline.destroyAllDatabase,
  // replication
  hasReplication: offline.hasReplication,
  replicateFromCozy: offline.replicateFromCozy,
  stopReplication: offline.stopReplication,
  stopAllReplication: offline.stopAllReplication,
  // repeated replication
  hasRepeatedReplication: offline.hasRepeatedReplication,
  startRepeatedReplication: offline.startRepeatedReplication,
  stopRepeatedReplication: offline.stopRepeatedReplication,
  stopAllRepeatedReplication: offline.stopAllRepeatedReplication
}

const settingsProto = {
  diskUsage: settings.diskUsage,
  changePassphrase: settings.changePassphrase,
  getInstance: settings.getInstance,
  updateInstance: settings.updateInstance,
  getClients: settings.getClients,
  deleteClientById: settings.deleteClientById,
  updateLastSync: settings.updateLastSync
}

const ensureHasReconnectParam = _url => {
  const url = new URL(_url)
  if (url.searchParams && !url.searchParams.has('reconnect')) {
    url.searchParams.append('reconnect', 1)
  } else if (!url.search || url.search.indexOf('reconnect') === -1) {
    // Some old navigators do not have the searchParams API
    // and it is not polyfilled by babel-polyfill
    url.search = url.search + '&reconnect=1'
  }
  return url.toString()
}

class Client {
  constructor(options) {
    this.data = {}
    this.files = {}
    this.intents = {}
    this.jobs = {}
    this.offline = {}
    this.settings = {}
    this.auth = {
      Client: ClientV3,
      AccessToken: AccessTokenV3,
      AppToken: AppTokenV3,
      LocalStorage: LocalStorage,
      MemoryStorage: MemoryStorage
    }
    this._inited = false
    if (options) {
      this.init(options)
    }
  }

  init(options = {}) {
    this._inited = true
    this._oauth = false // is oauth activated or not
    this._token = null // application token
    this._authstate = AuthNone
    this._authcreds = null
    this._storage = null
    this._version = options.version || null
    this._offline = null

    const token = options.token
    const oauth = options.oauth
    if (token && oauth) {
      throw new Error(
        'Cannot specify an application token with a oauth activated'
      )
    }

    if (token) {
      this._token = new AppTokenV3({ token })
    } else if (oauth) {
      this._oauth = true
      this._storage = oauth.storage
      this._clientParams = Object.assign(
        {},
        defaultClientParams,
        oauth.clientParams
      )
      this._onRegistered = oauth.onRegistered || nopOnRegistered
    }

    let url = options.cozyURL || ''
    while (url[url.length - 1] === '/') {
      url = url.slice(0, -1)
    }

    this._url = url

    this._invalidTokenErrorHandler =
      options.onInvalidTokenError !== undefined
        ? options.onInvalidTokenError
        : cozyFetch.handleInvalidTokenError

    const disablePromises = !!options.disablePromises
    addToProto(this, this.data, dataProto, disablePromises)
    addToProto(this, this.auth, authProto, disablePromises)
    addToProto(this, this.files, filesProto, disablePromises)
    addToProto(this, this.intents, intentsProto, disablePromises)
    addToProto(this, this.jobs, jobsProto, disablePromises)
    addToProto(this, this.offline, offlineProto, disablePromises)
    addToProto(this, this.settings, settingsProto, disablePromises)

    if (options.offline) {
      this.offline.init(options.offline)
    }

    this.fetch = function _fetch(method, url, options = {}) {
      return cozyFetch.cozyFetch(this, url, { ...options, method })
    }

    this.fetchJSON = function _fetchJSON() {
      const args = [this].concat(Array.prototype.slice.call(arguments))
      return cozyFetch.cozyFetchJSON.apply(this, args)
    }
  }

  authorize(forceTokenRefresh = false) {
    const state = this._authstate
    if (state === AuthOK || state === AuthRunning) {
      return this._authcreds
    }

    this._authstate = AuthRunning
    this._authcreds = this.isV2().then(isV2 => {
      if (isV2 && this._oauth) {
        throw new Error('OAuth is not supported on the V2 stack')
      }
      if (this._oauth) {
        if (forceTokenRefresh && this._clientParams.redirectURI) {
          this._clientParams.redirectURI = ensureHasReconnectParam(
            this._clientParams.redirectURI
          )
        }
        return auth.oauthFlow(
          this,
          this._storage,
          this._clientParams,
          this._onRegistered,
          forceTokenRefresh
        )
      }
      // we expect to be on a client side application running in a browser
      // with cookie-based authentication.
      if (isV2) {
        return getAppTokenV2()
      } else if (this._token) {
        return Promise.resolve({ client: null, token: this._token })
      } else {
        throw new Error('Missing application token')
      }
    })

    this._authcreds.then(
      () => {
        this._authstate = AuthOK
      },
      () => {
        this._authstate = AuthError
      }
    )

    return this._authcreds
  }

  saveCredentials(client, token) {
    const creds = { client, token }
    if (!this._storage || this._authstate === AuthRunning) {
      return Promise.resolve(creds)
    }
    this._storage.save(auth.CredsKey, creds)
    this._authcreds = Promise.resolve(creds)
    return this._authcreds
  }

  fullpath(path) {
    return this.isV2().then(isV2 => {
      const pathprefix = isV2 ? '/ds-api' : ''
      return this._url + pathprefix + path
    })
  }

  isV2() {
    if (!this._version) {
      return retry(() => fetch(`${this._url}/status/`), 3)()
        .then(res => {
          if (!res.ok) {
            throw new Error('Could not fetch cozy status')
          } else {
            return res.json()
          }
        })
        .then(status => {
          this._version = status.datasystem !== undefined ? 2 : 3
          return this.isV2()
        })
    }
    return Promise.resolve(this._version === 2)
  }
}

function nopOnRegistered() {
  throw new Error('Missing onRegistered callback')
}

function protoify(context, fn) {
  return function prototyped(...args) {
    return fn(context, ...args)
  }
}

function addToProto(ctx, obj, proto, disablePromises) {
  for (const attr in proto) {
    let fn = protoify(ctx, proto[attr])
    if (disablePromises) {
      fn = unpromiser(fn)
    }
    obj[attr] = fn
  }
}

module.exports = new Client()
Object.assign(module.exports, { Client, LocalStorage, MemoryStorage })
