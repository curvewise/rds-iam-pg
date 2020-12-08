import Joi from 'joi'
import { configSchema } from '../config-schema'

const { databaseUrl } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
)

console.log(databaseUrl)
