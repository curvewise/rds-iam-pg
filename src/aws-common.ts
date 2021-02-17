import AWS from 'aws-sdk'

export function getSharedIniFileCredentialsFromAwsProfileIfDefined(
  awsProfile?: string
): AWS.SharedIniFileCredentials | undefined {
  return awsProfile
    ? new AWS.SharedIniFileCredentials({ profile: awsProfile })
    : undefined
}

export function loadConfig({
  awsProfile,
  options,
}: {
  awsProfile?: string
  options?: Partial<AWS.ConfigurationOptions>
} = {}): AWS.Config {
  return new AWS.Config({
    ...options,
    credentials: getSharedIniFileCredentialsFromAwsProfileIfDefined(awsProfile),
  })
}
