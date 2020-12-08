import http from 'http'
import { promisify } from 'util'
import merge from 'deepmerge'
import { Application } from 'express'
import portfinder from 'portfinder'
import { createApp } from './app'
import { Config } from './config-schema'

export type Listen = (port: number) => Promise<http.Server>

export interface TestServer {
  app: Application
  server: http.Server
  url: string
  close(): Promise<void>
  config: Config
}

export async function createTestServer(
  config: Partial<Config> = {}
): Promise<TestServer> {
  const mergedConfig = merge(require('config').util.toObject() as Config, {
    ...config,
    port: await portfinder.getPortPromise(),
  })

  const app = createApp(mergedConfig)

  const { port } = mergedConfig
  const url = `http://localhost:${port}/graphql`

  const listen = (promisify(app.listen.bind(app)) as unknown) as Listen
  const server = await listen(port)

  async function close(): Promise<void> {
    // Postgraphile does not clean itself up well, but we try.
    // https://github.com/graphile/postgraphile/issues/912
    // https://github.com/graphile/postgraphile/issues/461
    await server.close()
  }

  return { app, server, url, close, config: mergedConfig }
}
