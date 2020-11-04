'use strict'

const { promisify } = require('util')
const merge = require('deepmerge')
const portfinder = require('portfinder')
const { createApp } = require('./app')

async function createTestServer(config = {}) {
  const mergedConfig = merge(require('config').util.toObject(), config)
  if (!mergedConfig.port) {
    mergedConfig.port = await portfinder.getPortPromise()
  }

  const app = createApp(mergedConfig)

  const { port } = mergedConfig
  const url = `http://localhost:${port}/graphql`

  const listen = promisify(app.listen.bind(app))
  const server = await listen(port)

  async function close() {
    // Postgraphile does not clean itself up well, but we try.
    // https://github.com/graphile/postgraphile/issues/912
    // https://github.com/graphile/postgraphile/issues/461
    await server.close()
  }

  return { app, server, url, close }
}

module.exports = { createTestServer }
