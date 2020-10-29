# goldie-data-layer

## System Dependendencies for Local Development

On Fedora, install the following:

```sh
sudo dnf install perl-autodie.noarch perl-open.noarch
```

This is needed to get the `format:sql:check` and `format:sql:fix` npm scripts
to work.

## Development

The only supported config setting is `databaseUrl`, which is required. Copy
`config/local.example.yml` to `config/local.yml` and uncomment one of the
lines. The complete config schema is documented in `src/config-schema.js`.

Then start the server:

```sh
npm start
```

Browse GraphiQL:

http://localhost:5000/graphiql

### Initializing a local PostgreSQL database:

1. Install PostgreSQL and start it:

   ```sh
   brew install postgresql
   brew services start postgresql
   ```

2. Create the database:

   ```sh
   createdb goldie
   ```

3. Initialize the database:
   ```sh
   npm run load-seed-data
   ```

### Changing the schema

Change the schema by creating the appropriate SQL tables and foreign key
relationships. This is done in `src/ddl.sql`.

Sample data exists and can be added in either of two places: SQL or
JSON/JavaScript. The SQL is in `src/seed_data.sql` and the JavaScript is in
`scripts/load-seed-data.js`.

Apply them to your database by running `npm run load-seed-data`. If the
server is running, it will take note of the changes and automatically expose
new GraphQL endpoints.

## Deployment

In deployed environments, you can configure the server using the environment
variables listed in `config/custom-environment-variables.yml`.

[**On every deploy**, including e.g. configuration changes][when], the app's
database is reset using the checked-in seed data.

[when]: https://devcenter.heroku.com/articles/release-phase#when-does-the-release-command-run

### Review apps

Heroku is configured to create [review apps][] every time a PR is opened.
When the app is created, an ephemeral Heroku Postgres database is created
along with it. After each commit pushed to the branch, Heroku redeploys the
review app &ndash; which includes resetting the database using the checked-in
seed data.

You can develop against a review app by pointing your database URL to it.

[review apps]: https://devcenter.heroku.com/articles/github-integration-review-apps
