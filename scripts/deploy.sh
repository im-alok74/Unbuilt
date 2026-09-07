#!/usr/bin/env bash
# Unbuilt — one-shot Vercel deploy.
#   1. npx vercel login        (once)
#   2. bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] || { echo ".env.local not found"; exit 1; }
set -a; source .env.local; set +a

echo "Linking project 'unbuilt'..."
npx vercel link --yes --project unbuilt

for k in DATABASE_URL ENCRYPTION_KEY AUTH_SECRET APP_PIN NEXT_PUBLIC_MAPBOX_TOKEN GOOGLE_PLACES_API_KEY GEMINI_API_KEY; do
  v="${!k:-}"
  [ -z "$v" ] && { echo "skip $k (empty)"; continue; }
  for env in production preview development; do
    npx vercel env rm "$k" "$env" --yes >/dev/null 2>&1 || true
    printf '%s' "$v" | npx vercel env add "$k" "$env" >/dev/null
  done
  echo "set $k"
done

echo "Deploying to production..."
npx vercel deploy --prod --yes
