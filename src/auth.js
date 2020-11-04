'use strict'

const crypto = require('crypto')
const passport = require('passport')
const { BasicStrategy } = require('passport-http')

function timingSafeEqual(first, second) {
  return (
    first.length === second.length &&
    crypto.timingSafeEqual(Buffer.from(first), Buffer.from(second))
  )
}

function requireBasicAuth(app, { sharedSecret }) {
  passport.use(
    new BasicStrategy((username, password, done) => {
      // During development, we don't have accounts, so we trust anyone who
      // provides the shared secret to identify themselves.
      let valid = true
      valid = valid && username.length
      valid = valid && timingSafeEqual(password, sharedSecret)

      if (valid) {
        done(null, { username })
      } else {
        done(null, false)
      }
    })
  )
  app.use(passport.authenticate('basic', { session: false }))
}

module.exports = { requireBasicAuth }
