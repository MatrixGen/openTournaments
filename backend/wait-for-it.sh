#!/usr/bin/env bash
# wait-for-it.sh

host="$1"
port="$2"
shift 2
cmd="$@"

until nc -z "$host" "$port"; do
  echo "⏳ Waiting for $host:$port..."
  sleep 2
done

echo "✅ $host:$port is up, starting command..."
exec $cmd
