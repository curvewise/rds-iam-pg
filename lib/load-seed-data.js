const { Client } = require('pg')
const anonymized_female_views = require('../common-assets/measured-body/anonymized_female_views.json')

const client = new Client({connectionString: process.env.DATABASE_URL})
;(async () => {
  await client.connect()
  const measured_body_views_id = 1;
  await client.query('INSERT INTO measured_body_views VALUES ($1, $2, $3)', [measured_body_views_id, anonymized_female_views.version, anonymized_female_views.isPerspective])
  let id = 0;
  for ( const measurement of anonymized_female_views.measurements ){
    id++;
    await client.query('INSERT INTO measurement_views(id, name, index, measured_body_views_id) VALUES ($1, $2, $3, $4)', [id, measurement.name, measurement.index, measured_body_views_id]);
    await client.query('INSERT INTO body_views(id,  position,  target,  zoom,  measurement_views_id) VALUES ($1, $2, $3, $4, $5)', [id, measurement.view.position, measurement.view.target, measurement.view.zoom, id]);
  
  }
  await client.end()
})()
