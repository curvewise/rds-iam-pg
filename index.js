const express = require("express");
const { postgraphile } = require("postgraphile");
const cors = require('cors')
const Joi = require('joi')
const { configSchema } = require('./src/config-schema')

const { databaseUrl } = Joi.attempt(require('config').util.toObject(), configSchema)

const app = express();

app.get("/", (req, res) => res.send('Goldilocks graphql server'))

app.use(cors())

app.use(
  postgraphile(
    databaseUrl,
    "public",
    {
      watchPg: true,
      graphiql: true,
      enhanceGraphiql: true,
    }
  )
);

app.listen(process.env.PORT || 5000);
