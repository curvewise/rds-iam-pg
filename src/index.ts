import { AddressInfo } from 'net'
import url from 'url'
import { createApp } from './app'

const config = require('config').util.toObject()

const app = createApp(config)

const { port } = config
const server = app.listen(port, () => {
  const { address } = server.address() as AddressInfo
  const baseUrl = url.format({
    protocol: 'http',
    hostname: address,
    port,
    pathname: '/',
  })
  console.log(`Listening · ${baseUrl}graphql · ${baseUrl}graphiql`)
})
