import AWS from 'aws-sdk'
import Joi from 'joi'
import { loadConfig } from '../aws-common'
import {
  functionNameQualifiedForDeploymentEnvironment,
  importBucketForDeploymentEnvironment,
} from '../config-conventions'
import { configSchema, Config } from '../config-schema'

const packageJson = require('../../package.json')

const AWS_REGION = 'us-east-1'
const AWS_ACCOUNT_ID = '312760052655'

const { deploymentEnvironment, awsProfile } = Joi.attempt(
  require('config').util.toObject(),
  configSchema
) as Config

function mungedVersion(version: string): string {
  return `v${version.replace(/\./g, '_')}`
}

function arnForLambdaFunction({
  qualifiedFunctionName,
  version,
  region = AWS_REGION,
  accountId = AWS_ACCOUNT_ID,
}: {
  qualifiedFunctionName: string
  version: string
  region?: string
  accountId?: string
}): string {
  const unqualifiedArn = `arn:aws:lambda:${region}:${accountId}:function:${qualifiedFunctionName}`
  return version
    ? `${unqualifiedArn}:${mungedVersion(version)}`
    : unqualifiedArn
}

async function configureTrigger(version: string): Promise<void> {
  const bucket = importBucketForDeploymentEnvironment(deploymentEnvironment)
  const qualifiedFunctionName = functionNameQualifiedForDeploymentEnvironment({
    functionName: 's3-check-obj',
    deploymentEnvironment,
  })

  const s3Client = new AWS.S3(loadConfig({ awsProfile }))
  const request = {
    Bucket: bucket,
    NotificationConfiguration: {
      LambdaFunctionConfigurations: [
        {
          Id: 'invoke-lambda-s3-check-obj',
          LambdaFunctionArn: arnForLambdaFunction({
            qualifiedFunctionName,
            version,
          }),
          Events: ['s3:ObjectCreated:*'],
        },
      ],
    },
  }
  console.log(
    'Bucket notification configuration',
    JSON.stringify(request, undefined, 2)
  )
  await s3Client.putBucketNotificationConfiguration(request).promise()
}

async function main(): Promise<void> {
  if (deploymentEnvironment === 'pull-request') {
    console.log(
      'Skipping update of S3 trigger for pull-request deployment environment'
    )
    return
  }

  const version =
    packageJson.dependencies['@curvewise/armscyence-types-s3-check-obj']
  console.log(`Configuring S3 trigger for s3-check-obj@${version}`)
  await configureTrigger(version)
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
