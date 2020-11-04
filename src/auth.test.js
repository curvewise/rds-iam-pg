'use strict'

const { expect } = require('chai')
const { request } = require('graphql-request')
const { createTestServer } = require('./server-test-helpers')

const listDatasetQuery = `
  query ListDatasets {
    allDatasets {
      nodes {
        id
      }
    }
  }
`

describe('Authentication', () => {
  context('When auth is disabled', () => {
    let url, close
    beforeEach(async () => {
      ;({ url, close } = await createTestServer({ auth: { enabled: false } }))
    })
    afterEach(async () => {
      if (close) {
        close()
      }
    })

    it('fulfills an unauthenticated request', async () => {
      const {
        allDatasets: { nodes },
      } = await request(url, listDatasetQuery)
      expect(nodes).to.be.an('array')
    })
  })
})
