import { promisify } from 'util'
import AWS from 'aws-sdk'
import { Build, Plugin } from 'graphile-build'
import { makeExtendSchemaPlugin, gql } from 'graphile-utils'

export function createS3Client({
  awsProfile,
}: {
  awsProfile?: string
}): AWS.S3 {
  const config = new AWS.Config({
    credentials: awsProfile
      ? new AWS.SharedIniFileCredentials({ profile: awsProfile })
      : undefined,
  })
  return new AWS.S3(config)
}

export type ListBuckets = (
  request: AWS.S3.Types.ListObjectVersionsRequest
) => Promise<AWS.S3.Types.ListObjectsOutput>

export function promisifiedListObjects(s3Client: AWS.S3): ListBuckets {
  return promisify(s3Client.listObjects.bind(s3Client))
}

export function createUploadBucketListPlugin({
  s3Client,
  importBucket,
  awsConsoleSignInUrl,
}: {
  s3Client: AWS.S3
  importBucket: string
  awsConsoleSignInUrl: string
}): Plugin {
  const listObjects = promisifiedListObjects(s3Client)

  return makeExtendSchemaPlugin((build: Build) => ({
    typeDefs: gql`
      type GoldilocksUploadBucketListResponse {
        IsTruncated: Boolean
        Marker: String
        Name: String
        Prefix: String
        MaxKeys: Int
        Contents: [GoldilocksUploadBucketListResponseContents!]
      }

      type GoldilocksUploadBucketListResponseContents {
        Key: String!
        LastModified: Date!
        ETag: String!
        Size: Int!
        StorageClass: String!
      }

      type UploadBuckeMetadata {
        uploadBucketName: String!
        uploadBucketS3ConsoleUploadUrl: String!
        awsConsoleSignInUrl: String!
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
          awsConsoleSignInUrl,
        }),
      },
    },
  }))
}
