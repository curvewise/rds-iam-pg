'use strict'

const express = require('express')
const { postgraphile } = require('postgraphile')
const cors = require('cors')
const Joi = require('joi')
const { configSchema } = require('./src/config-schema')
const AWS = require('aws-sdk')
const { makeExtendSchemaPlugin, gql } = require('graphile-utils')
const util = require('util')

const { databaseUrl, awsProfile, importBucket } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
)
const myConfig = new AWS.Config({
  credentials: awsProfile
    ? new AWS.SharedIniFileCredentials({ profile: awsProfile })
    : undefined,
})
const s3 = new AWS.S3(myConfig)
const listObjects = util.promisify(s3.listObjects.bind(s3))

const app = express()

app.get('/', (req, res) => res.send('Goldilocks graphql server'))

app.use(cors())

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
  })
)

app.listen(process.env.PORT || 5000)
