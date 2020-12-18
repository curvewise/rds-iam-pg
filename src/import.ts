import { promisify } from 'util'
import zlib from 'zlib'
import AWS from 'aws-sdk'
import { Build, Plugin } from 'graphile-build'
import { makeExtendSchemaPlugin, gql } from 'graphile-utils'
import { Client } from 'pg'
import {
  importBucketForDeploymentEnvironment,
  storageBucketForDeploymentEnvironment,
} from './config-conventions'
import { s3KeyForGeometry } from './s3'

const gzip = promisify(zlib.gzip)

async function assertIsValidObj(
  pgClient: Client,
  { eTag }: { eTag: string }
): Promise<void> {
  const {
    rows,
  } = await pgClient.query(
    'SELECT is_valid_obj FROM checked_uploads WHERE e_tag = $1',
    [eTag]
  )
  if (rows.length === 0) {
    throw Error('No check result for the specified eTag')
  } else if (rows[0].is_valid_obj !== true) {
    throw Error('The key with the specified eTag is not a valid OBJ')
  }
}

async function insertSubject(
  pgClient: Client,
  {
    subjectName,
    gender,
    datasetId,
  }: { subjectName: string; gender?: string; datasetId: number }
): Promise<number | undefined> {
  const { rows } = await pgClient.query(
    `
    INSERT INTO subjects (name, gender, dataset_id)
    VALUES ($1, $2, $3)
    ON CONFLICT ON CONSTRAINT name_is_unique
        DO NOTHING
    RETURNING id
    `,
    [subjectName, gender, datasetId]
  )
  if (rows.length === 1) {
    return rows[0].id
  } else {
    return undefined
  }
}

async function fetchSubjectAndValidateGender(
  pgClient: Client,
  {
    subjectName,
    gender,
    datasetId,
  }: { subjectName: string; gender?: string; datasetId: number }
): Promise<number> {
  const { rows } = await pgClient.query(
    `
    SELECT id, gender
    FROM subjects
    WHERE name = $1 AND dataset_id = $2
    `,
    [subjectName, datasetId]
  )
  if (rows.length !== 1) {
    throw Error(
      'Unable to fetch subject ID after insert conflict. How did this happen?'
    )
  }
  if (rows[0].gender !== gender) {
    throw Error('Subject exists with conflicting gender')
  }
  return rows[0].id
}

async function insertPose(
  pgClient: Client,
  { subjectId, poseTypeId }: { subjectId: number; poseTypeId: number }
): Promise<number> {
  const { rows } = await pgClient.query(
    `
    INSERT INTO poses (pose_type_id, subject_id)
    VALUES ($1, $2)
    RETURNING id
    `,
    [poseTypeId, subjectId]
  )
  return rows[0].id
}

async function insertGeometry(
  pgClient: Client,
  { poseId, s3Key, version }: { poseId: number; s3Key: string; version: number }
): Promise<number> {
  const { rows } = await pgClient.query(
    `
    INSERT INTO geometries (pose_id, s3_key, version)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [poseId, s3Key, version]
  )
  return rows[0].id
}

const KNOWN_ENCODINGS = [
  'ascii',
  'utf8',
  'utf-8',
  'utf16le',
  'ucs2',
  'ucs-2',
  'base64',
  'latin1',
  'binary',
  'hex',
]

async function gzipAndMoveTextFile(
  s3Client: AWS.S3,
  {
    fromKey,
    fromBucket,
    toKey,
    toBucket,
    contentType = 'text/plain',
  }: {
    fromKey: string
    fromBucket: string
    toKey: string
    toBucket: string
    contentType?: string
  }
): Promise<void> {
  // TODO: Consider making this more efficient using streams.
  // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/requests-using-stream-objects.html
  const {
    Body: fromContents,
    ContentEncoding: fromEncoding,
  } = await s3Client.getObject({ Bucket: fromBucket, Key: fromKey }).promise()
  const encoding =
    fromEncoding && KNOWN_ENCODINGS.includes(fromEncoding)
      ? fromEncoding
      : 'ascii'
  const toContents = await gzip(
    (fromContents as Buffer).toString(encoding as any)
  )
  await s3Client
    .putObject({
      Bucket: toBucket,
      Key: toKey,
      Body: toContents,
      ContentType: contentType,
      ContentEncoding: 'gzip',
    })
    .promise()
  await s3Client.deleteObject({ Bucket: fromBucket, Key: fromKey }).promise()
}

const IMPORT_GEOMETRY_SAVEPOINT = 'import_geometry_mutation'

export function createImportGeometryPlugin({
  s3Client,
  deploymentEnvironment,
}: {
  s3Client: AWS.S3
  deploymentEnvironment: string
}): Plugin {
  const importBucket = importBucketForDeploymentEnvironment(
    deploymentEnvironment
  )
  const storageBucket = storageBucketForDeploymentEnvironment(
    deploymentEnvironment
  )

  return makeExtendSchemaPlugin((build: Build) => {
    const { pgSql: sql } = build

    return {
      typeDefs: gql`
        input ImportGeometryInput {
          datasetId: Int!
          subjectName: String!
          gender: String
          poseTypeId: Int!
          s3Key: String!
          eTag: String!
        }

        type ImportGeometryResponse {
          geometry: Geometry @pgField
        }

        extend type Mutation {
          importGeometry(input: ImportGeometryInput!): ImportGeometryResponse
        }
      `,
      resolvers: {
        Mutation: {
          // See for reference:
          // https://www.graphile.org/postgraphile/make-extend-schema-plugin/#mutation-example
          importGeometry: async (_query, args, context, resolveInfo) => {
            const { pgClient } = context
            const {
              datasetId,
              subjectName,
              gender,
              poseTypeId,
              s3Key: fromS3Key,
              eTag,
            } = args.input

            // Validate the input.
            await assertIsValidObj(pgClient, { eTag })

            // Insert the data. If subject already exists, validate that the
            // gender matches.
            await pgClient.query(`SAVEPOINT ${IMPORT_GEOMETRY_SAVEPOINT}`)
            try {
              let subjectId: number | undefined
              subjectId = await insertSubject(pgClient, {
                subjectName,
                gender,
                datasetId,
              })
              if (subjectId === undefined) {
                subjectId = await fetchSubjectAndValidateGender(pgClient, {
                  subjectName,
                  gender,
                  datasetId,
                })
              }
              const poseId = await insertPose(pgClient, {
                subjectId,
                poseTypeId,
              })
              // This mutation only handles imports, which always start with
              // version 1. Updates are handled through their own mutation.
              const version = 1
              const toS3Key = s3KeyForGeometry({
                datasetId,
                subjectId,
                poseId,
                version,
              })
              const geometryId = await insertGeometry(pgClient, {
                poseId,
                s3Key: toS3Key,
                version,
              })

              // Prepare the response.
              const [
                responseData,
              ] = await resolveInfo.graphile.selectGraphQLResultFromTable(
                sql.fragment`geometries`,
                (tableAlias, queryBuilder) => {
                  queryBuilder.where(
                    sql.fragment`${tableAlias}.id = ${sql.value(geometryId)}`
                  )
                }
              )

              // Finally, move the file into place.
              await gzipAndMoveTextFile(s3Client, {
                fromBucket: importBucket,
                fromKey: fromS3Key,
                toBucket: storageBucket,
                toKey: toS3Key,
                contentType: 'text/plain',
              })

              return { data: responseData, query: build.$$isQuery }
            } catch (e) {
              await pgClient.query(
                `ROLLBACK TO SAVEPOINT ${IMPORT_GEOMETRY_SAVEPOINT}`
              )
              throw e
            } finally {
              await pgClient.query(
                `RELEASE SAVEPOINT ${IMPORT_GEOMETRY_SAVEPOINT}`
              )
            }
          },
        },
      },
    }
  })
}
