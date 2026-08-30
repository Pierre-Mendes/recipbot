#!/bin/sh
set -e

# Ensure the schema exists before the app starts serving requests.
# Without this the container boots against an empty database and every
# query fails with "relation \"users\" does not exist" (SQLSTATE 42P01).
#
# Only the container that sets RUN_MIGRATIONS=true (the `app` service)
# runs migrations, so the queue/scheduler workers don't race on it.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "==> Running database migrations..."
    php artisan migrate --force
fi

exec "$@"
