import crypto from 'crypto'
import { promisify } from 'util'
import zlib from 'zlib'
import AWS from 'aws-sdk'
import chai, { expect } from 'chai'
import { request } from 'graphql-request'
import { gql } from 'graphile-utils'
import Joi from 'joi'
import { Pool } from 'pg'
import { loadConfig } from './aws-common'
import {
  importBucketForDeploymentEnvironment,
  storageBucketForDeploymentEnvironment,
} from './config-conventions'
import { configSchema, Config } from './config-schema'
import { poolConfig } from './postgraphile-common'
import { createTestServer } from './server-test-helpers'

chai.use(require('chai-as-promised'))

const gunzip = promisify(zlib.gunzip)

const { awsProfile } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
) as Config

const COMMON_TEST_ENVIRONMENT = 'test'
const IMPORT_BUCKET = importBucketForDeploymentEnvironment(
  COMMON_TEST_ENVIRONMENT
)
const STORAGE_BUCKET = storageBucketForDeploymentEnvironment(
  COMMON_TEST_ENVIRONMENT
)

interface UploadedExampleFile {
  uploadedContent: string
  uploadedS3Key: string
  eTag: string
}

async function uploadExampleFile(
  s3Client: AWS.S3
): Promise<UploadedExampleFile> {
  // To ensure the eTag is different each time, use unique content rather than
  // an OBJ fixture.
  const uploadedContent = crypto.randomBytes(256).toString('hex')
  const uploadedS3Key = `${crypto.randomBytes(18).toString('hex')}.obj`
  const { ETag } = await s3Client
    .putObject({
      Bucket: IMPORT_BUCKET,
      Key: uploadedS3Key,
      Body: uploadedContent,
    })
    .promise()
  // The API puts the eTag in double quotes. Remove them.
  const eTag = ETag.replace(/"/g, '')
  return { uploadedContent, uploadedS3Key, eTag }
}

async function noteValidObj(pool: Pool, eTag: string): Promise<void> {
  await pool.query(
    'INSERT INTO checked_uploads (e_tag, is_valid_obj) VALUES ($1, TRUE)',
    [eTag]
  )
}

const IMPORT_GEOMETRY_MUTATION = gql`
  mutation ImportGeometryMutation(
    $datasetId: Int!
    $subjectName: String!
    $poseTypeId: Int!
    $s3Key: String!
    $eTag: String!
  ) {
    importGeometry(
      input: {
        datasetId: $datasetId
        subjectName: $subjectName
        gender: "F"
        poseTypeId: $poseTypeId
        s3Key: $s3Key
        eTag: $eTag
      }
    ) {
      geometry {
        id
      }
    }
  }
`

describe('Import', () => {
  let s3Client: AWS.S3
  before('create the S3 client', () => {
    s3Client = new AWS.S3(loadConfig({ awsProfile }))
  })

  let url: string, close: () => Promise<void>, pool: Pool
  before('start the test server and database pool', async () => {
    let database
    ;({
      url,
      close,
      config: { database },
    } = await createTestServer({
      auth: { enabled: false },
      deploymentEnvironment: COMMON_TEST_ENVIRONMENT,
    }))
    pool = new Pool(poolConfig(database))
  })
  after('tear down the test server and database pool', async () => {
    if (close) {
      close()
      close = undefined
    }
    if (pool) {
      pool.end()
      pool = undefined
    }
  })

  let datasetId: number
  before('create the dataset', async () => {
    ;({
      createDataset: {
        dataset: { id: datasetId },
      },
    } = await request(
      url,
      gql`
        mutation CreateDatasetMutation {
          createDataset(
            input: {
              dataset: {
                name: "Test Dataset"
                units: CM
                bodyPart: BODY
                anteriorDirection: Z
                superiorDirection: Y
                topology: MESHCAPADE_SM4
              }
            }
          ) {
            dataset {
              id
            }
          }
        }
      `
    ))
  })

  context(
    'When the subject does not exist, the geometry exists on S3, and the geometry has been checked',
    () => {
      let uploadedContent: string, uploadedS3Key: string, eTag: string
      beforeEach(async function () {
        this.timeout('5s')
        ;({ uploadedContent, uploadedS3Key, eTag } = await uploadExampleFile(
          s3Client
        ))
        await noteValidObj(pool, eTag)
      })

      let geometryId: number
      beforeEach('perform the mutation!', async () => {
        ;({
          importGeometry: {
            geometry: { id: geometryId },
          },
        } = await request(url, IMPORT_GEOMETRY_MUTATION, {
          datasetId,
          subjectName: `subject-${eTag}`,
          poseTypeId: 1,
          s3Key: uploadedS3Key,
          eTag,
        }))
      })

      it('imports the geometry to the provided dataset, as version 1', async () => {
        const { geometryById } = await request(
          url,
          gql`
            query GeometryQuery($geometryId: Int!) {
              geometryById(id: $geometryId) {
                datasetId
                version
              }
            }
          `,
          { geometryId }
        )
        expect(geometryById).to.include({ datasetId, version: 1 })
      })

      it('gzips the file and copies it to the storage bucket', async () => {
        const {
          geometryById: { s3Key },
        } = await request(
          url,
          gql`
            query GeometryQuery($geometryId: Int!) {
              geometryById(id: $geometryId) {
                s3Key
              }
            }
          `,
          { geometryId }
        )
        const { Body, ContentEncoding } = await s3Client
          .getObject({ Bucket: STORAGE_BUCKET, Key: s3Key })
          .promise()
        expect(ContentEncoding).to.equal('gzip')
        expect((await gunzip(Body as Buffer)).toString('utf-8')).to.equal(
          uploadedContent
        )
      })

      it('removes the file from the upload bucket', async () => {
        await expect(
          s3Client
            .getObject({ Bucket: IMPORT_BUCKET, Key: uploadedS3Key })
            .promise()
        ).to.be.rejectedWith('The specified key does not exist.')
      })
    }
  )

  context('When the geometry does not exist on S3', () => {
    let eTag: string
    beforeEach(async () => {
      eTag = crypto.randomBytes(12).toString('hex')
      await noteValidObj(pool, eTag)
    })
    it('returns the expected error', async () => {
      await expect(
        request(url, IMPORT_GEOMETRY_MUTATION, {
          datasetId,
          subjectName: 'example-non-existent',
          poseTypeId: 1,
          s3Key: `${crypto.randomBytes(18).toString('hex')}.obj`,
          eTag,
        })
      ).to.be.rejectedWith('The specified key does not exist.')
    })
  })

  context('When the geometry has not been checked', () => {
    it('returns the expected error', async () => {
      await expect(
        request(url, IMPORT_GEOMETRY_MUTATION, {
          datasetId,
          subjectName: 'example-non-existent',
          poseTypeId: 1,
          s3Key: `${crypto.randomBytes(18).toString('hex')}.obj`,
          eTag: crypto.randomBytes(12).toString('hex'),
        })
      ).to.be.rejectedWith('No check result for the specified eTag')
    })
  })

  context(
    'When the subject already exists, but the requested pose does not',
    () => {
      let uploadedFiles: UploadedExampleFile[]
      beforeEach(async function () {
        this.timeout('5s')
        uploadedFiles = []
        for (let i = 0; i < 2; ++i) {
          const uploaded = await uploadExampleFile(s3Client)
          uploadedFiles.push(uploaded)
          await noteValidObj(pool, uploaded.eTag)
        }
      })

      beforeEach('import the first pose', async () => {
        const { uploadedS3Key, eTag } = uploadedFiles[0]
        await request(url, IMPORT_GEOMETRY_MUTATION, {
          datasetId,
          subjectName: `subject-${eTag}`,
          poseTypeId: 1,
          s3Key: uploadedS3Key,
          eTag,
        })
      })

      let geometryId: number
      beforeEach('import the second pose', async () => {
        const { uploadedS3Key, eTag } = uploadedFiles[1]
        ;({
          importGeometry: {
            geometry: { id: geometryId },
          },
        } = await request(url, IMPORT_GEOMETRY_MUTATION, {
          datasetId,
          subjectName: `subject-${eTag}`,
          poseTypeId: 3,
          s3Key: uploadedS3Key,
          eTag,
        }))
      })

      it('imports the second pose', async () => {
        const { geometryById } = await request(
          url,
          gql`
            query GeometryQuery($geometryId: Int!) {
              geometryById(id: $geometryId) {
                poseByPoseId {
                  poseTypeId
                }
              }
            }
          `,
          { geometryId }
        )
        expect(geometryById.poseByPoseId).to.include({ poseTypeId: 3 })
      })
    }
  )

  context(
    'When the subject already exists, and the requested pose already exists',
    () => {
      let uploadedFiles: UploadedExampleFile[]
      beforeEach(async function () {
        this.timeout('5s')
        uploadedFiles = []
        for (let i = 0; i < 2; ++i) {
          const uploaded = await uploadExampleFile(s3Client)
          uploadedFiles.push(uploaded)
          await noteValidObj(pool, uploaded.eTag)
        }
      })

      const subjectName = crypto.randomBytes(12).toString('hex')

      beforeEach('import the first pose', async () => {
        const { uploadedS3Key, eTag } = uploadedFiles[0]
        await request(url, IMPORT_GEOMETRY_MUTATION, {
          datasetId,
          subjectName,
          poseTypeId: 1,
          s3Key: uploadedS3Key,
          eTag,
        })
      })

      it('returns the expected error', async () => {
        const { uploadedS3Key, eTag } = uploadedFiles[1]
        await expect(
          request(url, IMPORT_GEOMETRY_MUTATION, {
            datasetId,
            subjectName,
            poseTypeId: 1,
            s3Key: uploadedS3Key,
            eTag,
          })
        ).to.be.rejectedWith(
          'duplicate key value violates unique constraint "pose_type_is_unique"'
        )
      })
    }
  )
})
