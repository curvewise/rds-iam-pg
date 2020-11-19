'use strict'

// miscellaneous tests for the database

// connect to the db
// verify the state
// attempt to insert a row that we know will fail

const { Client } = require('pg')
const Joi = require('joi')
const { configSchema } = require('./config-schema')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)

const assert = chai.assert

const { databaseUrl } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
)

const client = new Client({ connectionString: databaseUrl })
describe('Insertion into job_results table should fail', () => {
  context(
    'When user attempts to insert a new row into the job_results table, and a row already exists in that table for that job, and that row contains a geometry that is associated with a different dataset',
    () => {
      beforeEach(async () => {
        await client.connect()
      })
      afterEach(async () => {
        await client.end()
      })

      it('triggers a custom exception in the database', async () => {
        // quick sanity check
        const result = await client.query(
          'select jr.job_results_dataset_id from public.job_results jr where jr.job_id = 2'
        )
        assert.equal(result.rows.length, 1)
        assert.equal(result.rows[0].job_results_dataset_id, 2)

        // insert a geometry id (1) that is associated with dataset 1
        await assert.isRejected(
          client.query(
            'insert into public.job_results (id, job_id, geometry_id) values(3, 2, 1)'
          ),
          'You attempted to insert a geometry for job 2 that is associated with dataset 1, but this job is already associated with dataset 2.'
        )
      })
    }
  )
})
