'use strict'

const Joi = require('joi')

const configSchema = Joi.object({
  port: Joi.number().required(),
  databaseUrl: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }),
  auth: Joi.object({
    enabled: Joi.boolean().required(),
    sharedSecret: Joi.alternatives().conditional('enabled', {
      is: Joi.equal(true),
      then: Joi.string().min(32).required(),
      otherwise: Joi.string(),
    }),
  }).required(),
  awsProfile: Joi.string(),
  importBucket: Joi.string().required(),
}).required()

module.exports = { configSchema }
