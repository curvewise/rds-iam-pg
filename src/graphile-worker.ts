import AWS from 'aws-sdk'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import { run, Runner } from 'graphile-worker'
import { createS3CheckObjTask } from './tasks/s3-check-obj'
import { getSharedIniFileCredentialsFromAwsProfileIfDefined } from './aws-common'

export interface PostgresAddress {
  host: string
  port: number
  user: string
  database: string
}

export function createRdsPgPool({
  awsRegion,
  address: { host, port, user, database },
  awsProfile,
}: {
  awsRegion: string
  awsProfile?: string
  address: PostgresAddress
}): Pool {
  const signer = new AWS.RDS.Signer({
    credentials: getSharedIniFileCredentialsFromAwsProfileIfDefined(awsProfile),
    region: awsRegion,
    hostname: host,
    port,
    username: user,
  })
  const token = signer.getAuthToken({})

  return new Pool({
    host,
    port,
    user,
    database,
    password: token,
    ssl: {
      rejectUnauthorized: true,
      ca: [
        fs.readFileSync(
          path.join(
            __dirname,
            '..',
            'common-assets',
            'certificates',
            'rds-ca-2019-root.pem'
          ),
          'ascii'
        ),
      ],
    },
  })
}

export async function startGraphileWorker({
  pool,
}: {
  pool: Pool
}): Promise<Runner> {
  return run({
    pgPool: pool,
    concurrency: 5,
    // Install signal handlers for graceful shutdown on SIGINT, SIGTERM, etc.
    noHandleSignals: false,
    pollInterval: 1000,
    taskList: {
      's3-check-obj': createS3CheckObjTask(pool),
    },
  })
}
