import { expect } from 'chai'
import { request } from 'graphql-request'
import { gql } from 'graphile-utils'
import { createTestServer } from './server-test-helpers'

const listDatasetQuery = gql`
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
    let url: string, close: () => Promise<void>
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
