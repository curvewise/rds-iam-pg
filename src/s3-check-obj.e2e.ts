import AWS from 'aws-sdk'
import chai, { expect } from 'chai'
import { request } from 'graphql-request'
import { gql } from 'graphile-utils'
import { createTestServer } from './server-test-helpers'
import Joi from 'joi'
import { configSchema, Config } from './config-schema'
import { v4 as uuidv4 } from 'uuid'
import { loadConfig } from './aws-common'
import { sleep } from 'wait-promise'

chai.use(require('chai-as-promised'))

const { awsProfile } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
) as Config

const s3Client = new AWS.S3(loadConfig({ awsProfile }))

const getUploadBucketName = gql`
  query {
    serverSettings {
      uploadBucketName
    }
  }
`

const listUploadBucketContents = gql`
  query {
    uploadBucketList {
      Contents {
        ETag
        Key
      }
    }
  }
`

const getCheckedUploadByETag = gql`
  query getCheckedUploadByETag($etag: String!) {
    checkedUploadByETag(eTag: $etag) {
      predictedBodyUnits
      topology
      eTag
      isValidObj
    }
  }
`

describe('E2E developer deployment environment', function () {
  this.timeout(15000)

  context('When developer deployment environment is created', () => {
    let url: string, close: () => Promise<void>
    beforeEach(async () => {
      ;({ url, close } = await createTestServer({ auth: { enabled: false } }))
    })
    afterEach(async () => {
      if (close) {
        close()
      }
    })

    it('can upload to the developer upload bucket, and get a response into its local database', async () => {
      const key = uuidv4()

      // get the upload bucket name
      const {
        serverSettings: { uploadBucketName },
      } = await request(url, getUploadBucketName)

      // upload a file to the upload bucket using S3
      await s3Client
        .upload({ Bucket: uploadBucketName, Key: key, Body: 'foo' })
        .promise()

      // list the upload bucket contents to confirm the file was uploaded, and to get the etag
      const {
        uploadBucketList: { Contents },
      } = await request(url, listUploadBucketContents)

      const bucketObj = Contents.find((o: { Key: string }) => o.Key === key)
      expect(bucketObj).not.to.be.undefined // eslint-disable-line no-unused-expressions

      const etag = bucketObj.ETag.slice(1, -1)

      // wait ~10s, then query graphql API to verify that it is populated
      await sleep(10000)

      const { checkedUploadByETag } = await request(
        url,
        getCheckedUploadByETag,
        { etag }
      )

      expect(checkedUploadByETag).not.to.be.null // eslint-disable-line no-unused-expressions
      expect(checkedUploadByETag.eTag).to.equal(etag)
      expect(checkedUploadByETag.isValidObj).to.equal(false)
    })
  })
})
