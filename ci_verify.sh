#!/bin/sh
set -e

# run through all the checks done for ci

bunx --bun tsc --noEmit
bunx --bun prettier --check .
