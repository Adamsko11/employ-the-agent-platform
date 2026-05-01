#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "[1/6] Cleaning any partial git state..."
rm -rf .git

echo "[2/6] Initializing fresh git repo..."
git init -q
git branch -M main
git config user.email "adam@evit-org.com"
git config user.name "Adam Skoneczny"

echo "[3/6] Staging files (env + node_modules excluded by .gitignore)..."
git add .

echo "[4/6] Committing..."
git commit -q -m "Initial commit — Employ the Agent platform v1"

echo "[5/6] Adding GitHub remote..."
git remote add origin https://github.com/Adamsko11/employ-the-agent-platform.git

echo "[6/6] Pushing to GitHub (will prompt for credentials)..."
echo "      Username: Adamsko11"
echo "      Password: paste a Personal Access Token (not your GH password)"
echo "      Get one at: https://github.com/settings/tokens/new (check 'repo' scope)"
echo
git push -u origin main

echo
echo "============================================"
echo " PUSHED!"
echo " https://github.com/Adamsko11/employ-the-agent-platform"
echo "============================================"
