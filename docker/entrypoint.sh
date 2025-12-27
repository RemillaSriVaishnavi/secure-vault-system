#!/bin/sh
set -e

echo "Starting local blockchain..."
npx hardhat node &

sleep 5

echo "Deploying contracts..."
npx hardhat run scripts/deploy.js --network localhost

echo "System ready."
tail -f /dev/null
