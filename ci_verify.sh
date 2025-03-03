#!/bin/sh
set -e

# run through all the checks done for ci

bunx tsc --noEmit
bunx prettier --check .
