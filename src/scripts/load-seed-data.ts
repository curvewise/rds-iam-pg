import { Client } from 'pg'
import Joi from 'joi'
import { configSchema, Config } from '../config-schema'
import { poolConfig } from '../postgraphile-common'

const anonymizedFemaleViews = require('../../common-assets/measured-body/anonymized_female_views.json')

const { database } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
) as Config

const client = new Client(poolConfig(database))
;(async () => {
  await client.connect()

  try {
    const {
      rows: [{ id: measuredBodyViewsId }],
    } = await client.query(
      'INSERT INTO measured_body_views (version, is_perspective) VALUES ($1, $2) RETURNING id',
      [anonymizedFemaleViews.version, anonymizedFemaleViews.isPerspective]
    )

    for (const measurement of anonymizedFemaleViews.measurements) {
      const {
        rows: [{ id: measurementViewsId }],
      } = await client.query(
        'INSERT INTO measurement_views (name, index, measured_body_views_id) VALUES ($1, $2, $3) RETURNING id',
        [measurement.name, measurement.index, measuredBodyViewsId]
      )

      await client.query(
        'INSERT INTO body_views (position, target, zoom, measurement_views_id) VALUES ($1, $2, $3, $4)',
        [
          measurement.view.position,
          measurement.view.target,
          measurement.view.zoom,
          measurementViewsId,
        ]
      )
    }
  } finally {
    await client.end()
  }
})()
