import Joi from 'joi'

export interface Config {
  port: number
  database: {
    url: string
    allowSelfSigned: boolean
  }
  auth: {
    enabled: boolean
    sharedSecret?: string
  }
  awsProfile?: string
  deploymentEnvironment: string
  awsConsoleSignInUrl: string
  graphileWorkerDb: {
    region: string
    hostname: string
    port: number
  }
  test?: {
    iamUserProfilesAvailable: string[]
    runningAsIamUser?: string
  }
}

export const configSchema = Joi.object({
  port: Joi.number().required(),
  database: Joi.object({
    url: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }),
    allowSelfSigned: Joi.boolean().required(),
  }).required(),
  auth: Joi.object({
    enabled: Joi.boolean().required(),
    sharedSecret: Joi.alternatives().conditional('enabled', {
      is: Joi.equal(true),
      then: Joi.string().min(32).required(),
      otherwise: Joi.string(),
    }),
  }).required(),
  awsProfile: Joi.string(),
  deploymentEnvironment: Joi.string().required(),
  awsConsoleSignInUrl: Joi.string()
    .uri({ scheme: ['https'] })
    .required(),
  test: Joi.object({
    iamUserProfilesAvailable: Joi.array().items(Joi.string()),
    runningAsIamUser: [Joi.string(), null],
  }),
  graphileWorkerDb: Joi.object({
    region: Joi.string().required(),
    hostname: Joi.string().required(),
    port: Joi.number().required(),
  }),
}).required()
