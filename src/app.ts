import AWS from 'aws-sdk'
import express, { Application } from 'express'
import { SchemaBuilder } from 'graphile-build'
import Joi from 'joi'
import { postgraphile } from 'postgraphile'
import cors from 'cors'
import { requireBasicAuth, RequestWithAuth } from './auth'
import { configSchema, Config } from './config-schema'
import { loadConfig } from './aws-common'
import { createUploadBucketListPlugin } from './s3'
import { isNullableType } from 'graphql/type/definition'
import { createRdsPgPool, startGraphileWorker } from './graphile-worker'
import { graphileWorkerPostgresUserForDeploymentEnvironment } from './config-conventions'
import { poolConfig } from './postgraphile-common'

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
    database,
    auth: { enabled: authEnabled, sharedSecret },
    awsProfile,
    deploymentEnvironment,
    awsConsoleSignInUrl,
    graphileWorkerDb: { region: awsRegion, hostname: pgHostname, port: pgPort },
  } = Joi.attempt(config, configSchema) as Config

  const app = express()

  app.use(cors({ credentials: true }))

  if (authEnabled) {
    if (!sharedSecret) {
      throw Error('Config validation should prevent reaching this point')
    }
    requireBasicAuth(app, { sharedSecret })
  }

  app.get('/', (req, res) => res.send('Goldilocks graphql server'))

  const s3Client = new AWS.S3(loadConfig({ awsProfile }))

  const plugins = [
    createUploadBucketListPlugin({
      s3Client,
      deploymentEnvironment,
      awsConsoleSignInUrl,
    }),
    NonNullRelationsPlugin,
  ]

  // these options are documented here:
  // https://www.graphile.org/postgraphile/usage-cli/
  const postgraphileHandler = postgraphile(poolConfig(database), 'public', {
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
  app.use(postgraphileHandler)

  const graphileWorkerPgPool = createRdsPgPool({
    awsRegion,
    awsProfile,
    address: {
      host: pgHostname,
      port: pgPort,
      user: graphileWorkerPostgresUserForDeploymentEnvironment(
        deploymentEnvironment
      ),
      database: deploymentEnvironment,
    },
  })

  startGraphileWorker({
    graphileWorkerPgPool,
    postgraphilePgPool: postgraphileHandler.pgPool,
  })

  return app
}
