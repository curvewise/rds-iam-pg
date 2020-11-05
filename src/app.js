'use strict'

const express = require('express')
const Joi = require('joi')
const { postgraphile } = require('postgraphile')
const cors = require('cors')
const { requireBasicAuth } = require('./auth')
const { configSchema } = require('./config-schema')
const { createS3Client, createUploadBucketListPlugin } = require('./s3')
const { isNullableType } = require('graphql/type/definition')

// look for root-level queries (e.g. allSubjects)
// and look-up by id (e.g. datasetById)
const reNonNullRelationsPlugin = /(^all.+$)|(^.+By.*Id$)/
function NonNullRelationsPlugin(builder) {
  builder.hook('GraphQLObjectType:fields:field', (field, build, context) => {
    if (
      reNonNullRelationsPlugin.test(context.scope.fieldName) &&
      isNullableType(field.type)
    ) {
      return {
        ...field,
        type: new build.graphql.GraphQLNonNull(field.type),
      }
    } else {
      return field
    }
  })
}

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

  const plugins = [
    createUploadBucketListPlugin({ s3Client, importBucket }),
    NonNullRelationsPlugin,
  ]

  app.use(
    // these options are documented here:
    // https://www.graphile.org/postgraphile/usage-cli/
    postgraphile(databaseUrl, 'public', {
      watchPg: true,
      graphiql: true,
      enhanceGraphiql: true,
      appendPlugins: plugins,
      setofFunctionsContainNulls: false,
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
