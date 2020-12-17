import Joi from 'joi'
import { configSchema } from '../config-schema'

const { database } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
)

console.log(database.url)
