const Joi = require('joi')

const configSchema = Joi.object({
  databaseUrl: Joi.string().uri({ scheme: ['postgresql'] }),
}).required()

module.exports = { configSchema }
