#!/usr/bin/env bash
# Deploy the Vite build to the gh-pages branch on origin.
#
# Usage: called via `pnpm deploy` (which runs `pnpm build` first).
# Must be run from the repo root on the main branch.
#
# What it does:
#   1. Copies dist/ into a temp directory.
#   2. Adds a .nojekyll file (tells GitHub Pages to skip Jekyll processing).
#   3. Inits a throwaway git repo in the temp dir.
#   4. Force-pushes a single commit to origin/gh-pages.
#
# The gh-pages branch contains only the built output — no source history.
# Force-push is intentional: each deploy replaces the previous one.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
REMOTE_URL="$(git -C "$REPO_ROOT" remote get-url origin)"
SHORT_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
DEPLOY_DATE="$(date -u '+%Y-%m-%d %H:%M UTC')"

DIST="$REPO_ROOT/dist"

if [ ! -d "$DIST" ]; then
  echo "Error: dist/ not found. Run pnpm build first." >&2
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# Copy build output and add .nojekyll so GitHub Pages skips Jekyll
cp -r "$DIST/." "$TMPDIR/"
touch "$TMPDIR/.nojekyll"

# Init a fresh repo, commit, and force-push to gh-pages
cd "$TMPDIR"
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy $DEPLOY_DATE (main@$SHORT_SHA)"
git push --force "$REMOTE_URL" gh-pages

echo ""
echo "Deployed to gh-pages (main@$SHORT_SHA)."
echo "Live at: https://fritzflorian.github.io/bytewarsv2/"
