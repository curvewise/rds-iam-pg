# goldie-data-layer

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

2. Set `DATABASE_URL` in `.env`:
    ```sh
    DATABASE_URL=postgresql://localhost:5432/goldie
    ```

3. Initialize the database:
    ```sh
    npm run load-seed-data
    ```

## Deployment

In deployed environments, you can configure the server using the environment
variables listed in `config/custom-environment-variables.yml`.