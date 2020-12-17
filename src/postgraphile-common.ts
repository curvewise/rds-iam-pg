import { PoolConfig } from 'pg'

export function poolConfig({
  url,
  allowSelfSigned,
}: {
  url: string
  allowSelfSigned: boolean
}): PoolConfig {
  return {
    connectionString: url,
    ssl: allowSelfSigned ? { rejectUnauthorized: false } : undefined,
  }
}
