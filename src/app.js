'use strict'

const express = require('express')
const Joi = require('joi')
const { postgraphile } = require('postgraphile')
const cors = require('cors')
const { requireBasicAuth } = require('./auth')
const { configSchema } = require('./config-schema')
const { createS3Client, createUploadBucketListPlugin } = require('./s3')

function createApp(config) {
  const {
    databaseUrl,
    auth: { enabled: authEnabled, sharedSecret },
    awsProfile,
    importBucket,
  } = Joi.attempt(config, configSchema)

  const s3Client = createS3Client({ awsProfile })

  const app = express()

  app.use(cors({ credentials: true }))

  if (authEnabled) {
    requireBasicAuth(app, { sharedSecret })
  }

  app.get('/', (req, res) => res.send('Goldilocks graphql server'))

  const plugins = [createUploadBucketListPlugin({ s3Client, importBucket })]

  app.use(
    postgraphile(databaseUrl, 'public', {
      watchPg: true,
      graphiql: true,
      enhanceGraphiql: true,
      appendPlugins: plugins,
      // Expose the username to PostgreSQL.
      // https://www.graphile.org/postgraphile/usage-library/#exposing-http-request-data-to-postgresql
      pgSettings: async req => ({
        'user.id': req.user ? req.user.username : 'unknown',
      }),
    })
  )

  return app
}

module.exports = { createApp }
