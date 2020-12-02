import { Client } from 'pg'
import Joi from 'joi'
import { configSchema } from '../src/config-schema'

const anonymizedFemaleViews = require('../common-assets/measured-body/anonymized_female_views.json')

const { databaseUrl } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
)

const client = new Client({ connectionString: databaseUrl })
;(async () => {
  await client.connect()
  const measuredBodyViewsId = 1
  await client.query('INSERT INTO measured_body_views VALUES ($1, $2, $3)', [
    measuredBodyViewsId,
    anonymizedFemaleViews.version,
    anonymizedFemaleViews.isPerspective,
  ])
  let id = 0
  for (const measurement of anonymizedFemaleViews.measurements) {
    id++
    await client.query(
      'INSERT INTO measurement_views(id, name, index, measured_body_views_id) VALUES ($1, $2, $3, $4)',
      [id, measurement.name, measurement.index, measuredBodyViewsId]
    )
    await client.query(
      'INSERT INTO body_views(id,  position,  target,  zoom,  measurement_views_id) VALUES ($1, $2, $3, $4, $5)',
      [
        id,
        measurement.view.position,
        measurement.view.target,
        measurement.view.zoom,
        id,
      ]
    )
  }
  await client.end()
})()
