import Joi from 'joi'
import { configSchema } from '../src/config-schema'

const { databaseUrl } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
)

console.log(databaseUrl)
