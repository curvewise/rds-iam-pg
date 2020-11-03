'use strict'

const crypto = require('crypto')
const url = require('url')
const express = require('express')
const passport = require('passport')
const { BasicStrategy } = require('passport-http')
const { postgraphile } = require('postgraphile')
const cors = require('cors')
const Joi = require('joi')
const { configSchema } = require('./src/config-schema')
const AWS = require('aws-sdk')
const { makeExtendSchemaPlugin, gql } = require('graphile-utils')
const util = require('util')

const {
  port,
  databaseUrl,
  auth: { enabled: authEnabled, sharedSecret },
  awsProfile,
  importBucket,
} = Joi.attempt(require('config').util.toObject(), configSchema)

const myConfig = new AWS.Config({
  credentials: awsProfile
    ? new AWS.SharedIniFileCredentials({ profile: awsProfile })
    : undefined,
})
const s3 = new AWS.S3(myConfig)
const listObjects = util.promisify(s3.listObjects.bind(s3))

const app = express()

app.use(cors({ credentials: true }))

function timingSafeEqual(first, second) {
  return (
    first.length === second.length &&
    crypto.timingSafeEqual(Buffer.from(first), Buffer.from(second))
  )
}

if (authEnabled) {
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

app.get('/', (req, res) => res.send('Goldilocks graphql server'))

const GoldilocksUploadBucketListPlugin = makeExtendSchemaPlugin(build => {
  return {
    typeDefs: gql`
      type GoldilocksUploadBucketListResponse {
        IsTruncated: Boolean
        Marker: String
        Name: String
        Prefix: String
        MaxKeys: Int
        Contents: [GoldilocksUploadBucketListResponseContents]
      }

      type GoldilocksUploadBucketListResponseContents {
        Key: String
        LastModified: Date
        ETag: String
        Size: Int
        StorageClass: String
      }

      extend type Query {
        uploadBucketList: GoldilocksUploadBucketListResponse
      }
    `,
    resolvers: {
      Query: {
        uploadBucketList: async () =>
          await listObjects({ Bucket: importBucket }),
      },
    },
  }
})

app.use(
  postgraphile(databaseUrl, 'public', {
    watchPg: true,
    graphiql: true,
    enhanceGraphiql: true,
    appendPlugins: [GoldilocksUploadBucketListPlugin],
    // Expose the username to PostgreSQL.
    // https://www.graphile.org/postgraphile/usage-library/#exposing-http-request-data-to-postgresql
    pgSettings: async req => ({
      'user.id': req.user ? req.user.username : 'unknown',
    }),
  })
)

const server = app.listen(port)

const { address } = server.address()
const baseUrl = url.format({
  protocol: 'http',
  hostname: address,
  port,
  pathname: '/',
})
console.log(`Listening at ${baseUrl}graphql ${baseUrl}graphiql`)
