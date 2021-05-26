#!/bin/bash

# package
# Builds packages for linux (deb, rpm, pacman, apk, zip), macos (pkg, zip) and win (zip)
# 
# Usage: scripts/package
# 
# Remember to run this script from the root of the project!

# DO NOT fail fast (this is because some packages, e.g. mac-pkg, may 
# not build if you are not on the right OS)
#set -e

# ANSI colour codes so we can highlight text in the terminal
colour_red="\033[0;31m"
colour_green="\033[0;32m"
colour_blue="\033[0;34m"
colour_cyan="\033[0;36m"

# Escape codes for making text bold and returning it back to normal
bold="\e[1m"
normal="\e[0m"

# First build the CLI
yarn build
cp ./package.json ./dist/package.json

echo -e "${bold}${colour_blue}job: generate-binaries; status: running${normal}"
# Then compile the JS code into binaries
yarn pkg .
echo -e "${bold}${colour_green}job: generate-binaries; status: done${normal}"
