'use strict'

const Joi = require('joi')

const configSchema = Joi.object({
  databaseUrl: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }),
  awsProfile: Joi.string(),
  importBucket: Joi.string().required(),
}).required()

module.exports = { configSchema }
