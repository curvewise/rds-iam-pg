'use strict'

const { promisify } = require('util')
const AWS = require('aws-sdk')
const { makeExtendSchemaPlugin, gql } = require('graphile-utils')

function createS3Client({ awsProfile }) {
  const config = new AWS.Config({
    credentials: awsProfile
      ? new AWS.SharedIniFileCredentials({ profile: awsProfile })
      : undefined,
  })
  return new AWS.S3(config)
}

function createUploadBucketListPlugin({ s3Client, importBucket }) {
  const listObjects = promisify(s3Client.listObjects.bind(s3Client))

  return makeExtendSchemaPlugin(build => ({
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

      type UploadBuckeMetadata {
        uploadBucketName: String!
        uploadBucketS3ConsoleUploadUrl: String!
      }

      extend type Query {
        uploadBucketList: GoldilocksUploadBucketListResponse
        serverSettings: UploadBuckeMetadata!
      }
    `,
    resolvers: {
      Query: {
        uploadBucketList: async () =>
          await listObjects({ Bucket: importBucket }),
        serverSettings: () => ({
          uploadBucketName: importBucket,
          uploadBucketS3ConsoleUploadUrl: `https://s3.console.aws.amazon.com/s3/upload/${importBucket}?region=us-east-1`,
        }),
      },
    },
  }))
}

module.exports = {
  createS3Client,
  createUploadBucketListPlugin,
}
