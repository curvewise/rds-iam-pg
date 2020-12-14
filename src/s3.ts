import AWS from 'aws-sdk'
import { Build, Plugin } from 'graphile-build'
import { makeExtendSchemaPlugin, gql } from 'graphile-utils'
import { importBucketForDeploymentEnvironment } from './config-conventions'

export function createUploadBucketListPlugin({
  s3Client,
  deploymentEnvironment,
  awsConsoleSignInUrl,
}: {
  s3Client: AWS.S3
  deploymentEnvironment: string
  awsConsoleSignInUrl: string
}): Plugin {
  const importBucket = importBucketForDeploymentEnvironment(
    deploymentEnvironment
  )

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
          await s3Client.listObjects({ Bucket: importBucket }).promise(),
        serverSettings: () => ({
          uploadBucketName: importBucket,
          uploadBucketS3ConsoleUploadUrl: `https://s3.console.aws.amazon.com/s3/upload/${importBucket}?region=us-east-1`,
          awsConsoleSignInUrl,
        }),
      },
    },
  }))
}
