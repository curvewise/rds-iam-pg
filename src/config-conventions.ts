export function importBucketForDeploymentEnvironment(
  deploymentEnvironment: string
): string {
  return `goldilocks-upload-${deploymentEnvironment}`
}
