#!/bin/bash -euo pipefail

psql $DATABASE_URL \
    -f src/reset.sql \
    -f src/ddl.sql \
    -f src/seed_data.sql 

node scripts/load-seed-data.js
