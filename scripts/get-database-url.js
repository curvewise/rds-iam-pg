'use strict'

const Joi = require('joi')
const { configSchema } = require('../src/config-schema')
const { databaseUrl } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
)

console.log(databaseUrl)
