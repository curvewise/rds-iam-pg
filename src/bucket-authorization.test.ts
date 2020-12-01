import { createS3Client, promisifiedListObjects } from './s3'
import chai, { expect } from 'chai'
import Joi from 'joi'
import { configSchema, Config } from './config-schema'

chai.use(require('chai-as-promised'))

const config = Joi.attempt(
  require('config').util.toObject(),
  configSchema
) as Config

const buckets = {
  PRODUCTION: 'goldilocks-upload-production',
  STAGING: 'goldilocks-upload-staging',
  PULL_REQUEST: 'goldilocks-upload-pull-request',
  SANDBOX: 'goldilocks-upload-sandbox',
  TEST: 'goldilocks-upload-test',
}

describe('Authorization', () => {
  ;[
    {
      profile: 'admin_test_user',
      permittedBuckets: [
        buckets.PRODUCTION,
        buckets.STAGING,
        buckets.PULL_REQUEST,
        buckets.SANDBOX,
        buckets.TEST,
      ],
    },
    {
      profile: 'program_manager_test_user',
      permittedBuckets: [buckets.PRODUCTION, buckets.STAGING],
    },
    {
      profile: 'developer_test_user',
      permittedBuckets: [buckets.PULL_REQUEST, buckets.SANDBOX, buckets.TEST],
    },
    {
      profile: 'goldilocks_data_layer_production',
      permittedBuckets: [buckets.PRODUCTION],
    },
    {
      profile: 'goldilocks_data_layer_pull_request',
      permittedBuckets: [buckets.PULL_REQUEST],
    },
    {
      profile: 'goldilocks_data_layer_sandbox',
      permittedBuckets: [buckets.SANDBOX],
    },
    {
      profile: 'goldilocks_data_layer_staging',
      permittedBuckets: [buckets.STAGING],
    },
    { profile: 'goldilocks_data_layer_test', permittedBuckets: [buckets.TEST] },
  ].forEach(({ profile, permittedBuckets }) => {
    if (
      (config.test &&
        config.test.iamUserProfilesAvailable &&
        !config.test.iamUserProfilesAvailable.includes(profile)) ||
      (config.test &&
        config.test.runningAsIamUser &&
        config.test.runningAsIamUser !== profile)
    ) {
      console.log('skipping profile %s', profile)
      return
    }

    context('When user profile is ' + profile, () => {
      const s3Client = createS3Client(
        config.test && config.test.runningAsIamUser
          ? {}
          : { awsProfile: profile }
      )
      const listObjects = promisifiedListObjects(s3Client)

      Object.values(buckets).forEach(bucketName => {
        // TODO: test other actions
        if (permittedBuckets.includes(bucketName)) {
          // permitted
          it('user can access bucket ' + bucketName, async () => {
            await expect(listObjects({ Bucket: bucketName })).to.be.fulfilled
          })
        } else {
          // not permitted
          it('user cannot access bucket ' + bucketName, async () => {
            await expect(
              listObjects({ Bucket: bucketName })
            ).to.be.rejectedWith('Access Denied')
          })
        }
      })
    })
  })
})
