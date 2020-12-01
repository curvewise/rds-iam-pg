import Joi from 'joi'

export interface Config {
  port: number
  databaseUrl: string
  auth: {
    enabled: boolean
    sharedSecret?: string
  }
  awsProfile?: string
  importBucket: string
  awsConsoleSignInUrl: string
  test?: {
    iamUserProfilesAvailable: string[]
    runningAsIamUser?: string
  }
}

export const configSchema = Joi.object({
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
  awsConsoleSignInUrl: Joi.string()
    .uri({ scheme: ['https'] })
    .required(),
  test: Joi.object({
    iamUserProfilesAvailable: Joi.array().items(Joi.string()),
    runningAsIamUser: [Joi.string(), null],
  }),
}).required()
