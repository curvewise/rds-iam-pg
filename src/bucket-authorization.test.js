'use strict'

const { createS3Client } = require('./s3')
const { promisify } = require('util')
const assert = require('assert')
const Joi = require('joi')
const config = require('config').util.toObject()
const { configSchema } = require('./config-schema')

Joi.attempt(config, configSchema)

const buckets = {
  PRODUCTION: 'goldilocks-upload-production',
  STAGING: 'goldilocks-upload-staging',
  PULL_REQUEST: 'goldilocks-upload-pull-request',
  SANDBOX: 'goldilocks-upload-sandbox',
  TEST: 'goldilocks-upload-test',
}

describe('Authorization', () => {
  ;[
    [
      'admin_test_user',
      [
        buckets.PRODUCTION,
        buckets.STAGING,
        buckets.PULL_REQUEST,
        buckets.SANDBOX,
        buckets.TEST,
      ],
    ],
    ['program_manager_test_user', [buckets.PRODUCTION, buckets.STAGING]],
    [
      'developer_test_user',
      [buckets.PULL_REQUEST, buckets.SANDBOX, buckets.TEST],
    ],
    ['goldilocks_data_layer_production', [buckets.PRODUCTION]],
    ['goldilocks_data_layer_pull_request', [buckets.PULL_REQUEST]],
    ['goldilocks_data_layer_sandbox', [buckets.SANDBOX]],
    ['goldilocks_data_layer_staging', [buckets.STAGING]],
    ['goldilocks_data_layer_test', [buckets.TEST]],
  ].forEach(([profile, permittedBuckets]) => {
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
      // test each bucket

      Object.keys(buckets).forEach(environment => {
        const bucketName = buckets[environment]
        // TODO: test other actions
        const listObjects = promisify(
          s3Client.listObjects.bind(s3Client, { Bucket: bucketName })
        )

        if (permittedBuckets.includes(bucketName)) {
          // permitted
          it('user can access bucket ' + bucketName, async () => {
            await assert.doesNotReject(listObjects)
          })
        } else {
          // not permitted
          it('user cannot access bucket ' + bucketName, async () => {
            await assert.rejects(listObjects)
          })
        }
      })
    })
  })
})
