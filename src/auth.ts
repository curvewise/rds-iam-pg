import crypto from 'crypto'
import { Application, Request } from 'express'
import passport from 'passport'
import { BasicStrategy } from 'passport-http'

export interface RequestWithAuth extends Request {
  user?: {
    username: string
  }
}

function timingSafeEqual(first: string, second: string): boolean {
  return (
    first.length === second.length &&
    crypto.timingSafeEqual(Buffer.from(first), Buffer.from(second))
  )
}

export function requireBasicAuth(
  app: Application,
  { sharedSecret }: { sharedSecret: string }
) {
  passport.use(
    new BasicStrategy((username, password, done) => {
      // During development, we don't have accounts, so we trust anyone who
      // provides the shared secret to identify themselves.
      let valid = true
      valid = valid && Boolean(username.length)
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
