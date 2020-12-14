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
}: { awsProfile?: string } = {}): AWS.Config {
  return new AWS.Config({
    credentials: getSharedIniFileCredentialsFromAwsProfileIfDefined(awsProfile),
  })
}
