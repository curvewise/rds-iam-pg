const Joi = require('joi')

const configSchema = Joi.object({
  databaseUrl: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }),
}).required()

module.exports = { configSchema }
