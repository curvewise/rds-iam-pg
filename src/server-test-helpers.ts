import http from 'http'
import { promisify } from 'util'
import merge from 'deepmerge'
import portfinder from 'portfinder'
import { createApp } from './app'
import { Config } from './config-schema'

export type Listen = (port: number) => Promise<http.Server>

export async function createTestServer(config = {}) {
  const mergedConfig = merge(
    require('config').util.toObject() as Config,
    config
  )
  if (!mergedConfig.port) {
    mergedConfig.port = await portfinder.getPortPromise()
  }

  const app = createApp(mergedConfig)

  const { port } = mergedConfig
  const url = `http://localhost:${port}/graphql`

  const listen = (promisify(app.listen.bind(app)) as unknown) as Listen
  const server = await listen(port)

  async function close() {
    // Postgraphile does not clean itself up well, but we try.
    // https://github.com/graphile/postgraphile/issues/912
    // https://github.com/graphile/postgraphile/issues/461
    await server.close()
  }

  return { app, server, url, close }
}
