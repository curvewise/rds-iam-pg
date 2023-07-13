import AWS from 'aws-sdk'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
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
            'rds-ca-2019-root.pem',
          ),
          'ascii',
        ),
      ],
    },
  })
}
