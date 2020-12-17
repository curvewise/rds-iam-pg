import crypto from 'crypto'
import { S3CheckObjResponse_v1 as S3CheckObjResponse } from '@curvewise/armscyence-types-s3-check-obj'
import { expect } from 'chai'
import { gql } from 'graphile-utils'
import { JobHelpers, Logger } from 'graphile-worker'
import { request } from 'graphql-request'
import { Pool } from 'pg'
import { createTestServer } from '../server-test-helpers'
import { poolConfig } from '../postgraphile-common'
import { createS3CheckObjTask } from './s3-check-obj'

const checkedUploadByETagQuery = gql`
  query CheckedUploadByETagQuery($eTag: String!) {
    checkedUploadByETag(eTag: $eTag) {
      eTag
      isValidObj
    }
  }
`

function createMockJobHelpers(): JobHelpers {
  return {
    logger: ({
      error() {},
      warn() {},
      info() {},
    } as unknown) as Logger,
  } as JobHelpers
}

function createMockS3CheckObjResponse({
  eTag,
  isValidObj,
}: {
  eTag: string
  isValidObj: boolean
}): S3CheckObjResponse {
  return {
    start_time: '...',
    duration_seconds: 3,
    runtime_info: {},
    success: true,
    result: {
      bucket: 'mybucket',
      key: 'HappyFace.jpg',
      eTag,
      checks: { isValidObj },
    },
    error: null,
    error_origin: null,
  }
}

function createMockFailureResponse(): S3CheckObjResponse {
  return {
    start_time: '...',
    duration_seconds: 3,
    runtime_info: {},
    success: false,
    result: null,
    error: ['bad', 'bad', 'bad'],
    error_origin: 'compute',
  }
}

describe('s3-check-obj task', () => {
  let url: string, close: () => Promise<void>, pool: Pool
  before(async () => {
    let database
    ;({
      url,
      close,
      config: { database },
    } = await createTestServer({ auth: { enabled: false } }))
    pool = new Pool(poolConfig(database))
  })
  after(async () => {
    if (close) {
      close()
      close = undefined
    }
    if (pool) {
      pool.end()
      pool = undefined
    }
  })

  let task
  before(() => {
    task = createS3CheckObjTask(pool)
  })

  context('When the eTag does not exist', () => {
    const eTag = crypto.randomBytes(24).toString('base64')

    it('inserts it in the database', async () => {
      await task(
        createMockS3CheckObjResponse({ eTag, isValidObj: true }),
        createMockJobHelpers()
      )

      expect(
        await request(url, checkedUploadByETagQuery, { eTag })
      ).to.deep.equal({ checkedUploadByETag: { eTag, isValidObj: true } })
    })
  })

  context('When the eTag already exists', () => {
    const eTag = crypto.randomBytes(24).toString('base64')

    it('updates the entry in the database', async () => {
      // Set up.
      await task(
        createMockS3CheckObjResponse({ eTag, isValidObj: true }),
        createMockJobHelpers()
      )

      // Confidence check.
      expect(
        await request(url, checkedUploadByETagQuery, { eTag })
      ).to.deep.equal({ checkedUploadByETag: { eTag, isValidObj: true } })

      // Act.
      await task(
        createMockS3CheckObjResponse({ eTag, isValidObj: false }),
        createMockJobHelpers()
      )

      // Assert.
      expect(
        await request(url, checkedUploadByETagQuery, { eTag })
      ).to.deep.equal({ checkedUploadByETag: { eTag, isValidObj: false } })
    })
  })

  context('When a computation error occurred', () => {
    it('finishes without crashing', async () => {
      await task(createMockFailureResponse(), createMockJobHelpers())
    })
  })

  context('When the message is malformed', () => {
    it('finishes without crashing', async () => {
      await task({ no: 'message' }, createMockJobHelpers())
    })
  })
})
