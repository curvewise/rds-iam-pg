const express = require("express");
const { postgraphile } = require("postgraphile");
const cors = require('cors')

const app = express();

app.get("/", (req, res) => res.send('Goldilocks graphql server'))

app.use(cors())

app.use(
  postgraphile(
    process.env.DATABASE_URL,
    "public",
    {
      watchPg: true,
      graphiql: true,
      enhanceGraphiql: true,
    }
  )
);

app.listen(process.env.PORT || 5000);
