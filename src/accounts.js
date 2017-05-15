import {cozyFetchJSON} from './fetch'

export function create (cozy, konnector, auth, name = '') {
  return cozyFetchJSON(cozy, 'POST', '/data/io.cozy.accounts/', {
    name: name,
    account_type: konnector.vendorLink,
    status: 'PENDING',
    auth: {
      login: auth.login,
      password: auth.password
    }
  })
}