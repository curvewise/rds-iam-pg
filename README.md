# rds-iam-pg

Convenience functions for connecting to RDS Postgres using IAM auth.

The `createRdsPgPool()` function uses AWS credentials present in the environment
or filesystem to create a signed token to authenticate with RDS Postgres using
IAM authentication.

It works in Lambda and any other Node environment.

## Usage

```ts
import { createRdsPgPool } from 'rds-iam-pg'

const pgPool = createRdsPgPool({
  awsRegion: 'us-east-1',
  awsProfile: process.env.AWS_PROFILE,
  address: {
    host: 'your.rds.hostname.aws'
    port: 5432,
    user: 'yourusername',
    database: 'yourdb',
  },
})
```

## License

This project is licensed under the Apache license, version 2.0.
