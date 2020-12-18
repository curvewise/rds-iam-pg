export function importBucketForDeploymentEnvironment(
  deploymentEnvironment: string
): string {
  return `goldilocks-upload-${deploymentEnvironment}`
}

export function storageBucketForDeploymentEnvironment(
  deploymentEnvironment: string
): string {
  return `goldilocks-storage-${deploymentEnvironment}`
}

export function graphileWorkerPostgresUserForDeploymentEnvironment(
  deploymentEnvironment: string
): string {
  return `goldilocks_data_layer_${deploymentEnvironment}`
}

export function functionNameQualifiedForDeploymentEnvironment({
  functionName,
  deploymentEnvironment,
}: {
  functionName: string
  deploymentEnvironment: string
}): string {
  return `${functionName}-${deploymentEnvironment}`
}
