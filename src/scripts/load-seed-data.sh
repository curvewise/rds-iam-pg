#!/bin/bash

set -euo pipefail

psql $DATABASE_URL \
    -v ON_ERROR_STOP=on \
    -f src/reset.sql \
    -f src/ddl.sql \
    -f src/seed_data.sql 

ts-node src/scripts/load-seed-data.ts
