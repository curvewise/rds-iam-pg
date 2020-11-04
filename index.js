'use strict'

const url = require('url')
const { createApp } = require('./src/app')

const config = require('config').util.toObject()

const app = createApp(config)

const { port } = config
const server = app.listen(port, () => {
  const { address } = server.address()
  const baseUrl = url.format({
    protocol: 'http',
    hostname: address,
    port,
    pathname: '/',
  })
  console.log(`Listening · ${baseUrl}graphql · ${baseUrl}graphiql`)
})
