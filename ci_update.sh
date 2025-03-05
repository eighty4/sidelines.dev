#!/bin/bash
set -e

dir="$(dirname "$0")"
(
  cd $dir
  git pull --quiet
  bun i --silent
  sudo systemctl restart sidelines.web
)
