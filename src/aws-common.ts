import AWS from 'aws-sdk'

export function loadConfig({
  awsProfile,
}: { awsProfile?: string } = {}): AWS.Config {
  return new AWS.Config({
    credentials: awsProfile
      ? new AWS.SharedIniFileCredentials({ profile: awsProfile })
      : undefined,
  })
}
