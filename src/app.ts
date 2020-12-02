import express, { Application } from 'express'
import { SchemaBuilder } from 'graphile-build'
import Joi from 'joi'
import { postgraphile } from 'postgraphile'
import cors from 'cors'
import { requireBasicAuth, RequestWithAuth } from './auth'
import { configSchema, Config } from './config-schema'
import { createS3Client, createUploadBucketListPlugin } from './s3'
import { isNullableType } from 'graphql/type/definition'

// look for root-level queries (e.g. allSubjects)
// and look-up by id (e.g. datasetById)
const reNonNullRelationsPlugin = /(^all.+$)|(^.+By.*Id$)/
function NonNullRelationsPlugin(builder: SchemaBuilder): void {
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

export function createApp(config: Config): Application {
  const {
    databaseUrl,
    auth: { enabled: authEnabled, sharedSecret },
    awsProfile,
    importBucket,
    awsConsoleSignInUrl,
  } = Joi.attempt(config, configSchema) as Config

  const s3Client = createS3Client({ awsProfile })

  const app = express()

  app.use(cors({ credentials: true }))

  if (authEnabled) {
    if (!sharedSecret) {
      throw Error('Config validation should prevent reaching this point')
    }
    requireBasicAuth(app, { sharedSecret: sharedSecret })
  }

  app.get('/', (req, res) => res.send('Goldilocks graphql server'))

  const plugins = [
    createUploadBucketListPlugin({
      s3Client,
      importBucket,
      awsConsoleSignInUrl,
    }),
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
      pgSettings: async (req: RequestWithAuth) => ({
        'user.id': req.user ? req.user.username : 'unknown',
      }),
    })
  )

  return app
}
