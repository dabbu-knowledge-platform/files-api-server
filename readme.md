# Dabbu Files API Server

[![NodeJS CI](https://github.com/dabbu-knowledge-platform/files-api-server/actions/workflows/ci.yml/badge.svg)](https://github.com/dabbu-knowledge-platform/files-api-server/actions/workflows/ci.yml) [![Platforms: Alpine Linux MacOS Windows](https://img.shields.io/badge/platforms-alpine%20linux%20macos%20windows-blue)](https://img.shields.io/badge/platforms-windows%20linux%20macos%20alpine-blue) [![Code Style: XO/Prettier](https://img.shields.io/badge/code%20style-xo%2Fprettier-ff69b4)](https://img.shields.io/badge/code%20style-xo%2Fprettier-ff69b4)

An implementation of the Dabbu Files API that enables you to access your files, folders and emails stored with multiple providers as simple files and folders, all in one place!

## Intro

Tired of having your files and folders randomly scattered about online with multiple providers like Google Drive and One Drive? Want to access all your files and folders using a single, unified interface? Dabbu’s APIs (Application Programming Interfaces) allow you to access your files and folders from any provider (Google Drive, Gmail, Microsoft OneDrive, etc) from a single, unified interface. Behind these APIs is a software layer that connects to these providers and returns your files and folders in one unified format. We'll let this GIF do the talking:

![](./media/DabbuCLI.gif)

<sub>Dabbu CLI retrieving files from Google Drive [Note: this GIF is outdated]</sub>

What you just saw there was Dabbu CLI in action - a simple program in javascript that leverages the Dabbu API to bring your files and folders at your fingertips from all over the web.

**This repo contains the server application that handles API calls from clients. The source for the CLI app demoed in the GIF above can be found [here](https://github.com/dabbu-knowledge-platform/cli).**

## Getting started

The installation can be done manually on Linux, Alpine Linux, MacOS, Android (Requires Termux) and Windows (Currently only 64-bit architectures are supported).

Follow the instructions [here](https://dabbu-knowledge-platform.github.io/impls/server) to install it on your computer.

## Updating the server

To update the server, simply download the new version from the [Releases page](https://github.com/dabbu-knowledge-platform/files-api-server/releases).

## Installing clients to call the Dabbu API

Here is a list of clients that use the Dabbu API to interact with your files and folders:

- [**Dabbu CLI**](https://github.com/dabbu-knowledge-platform/cli) - A CLI that leverages the Dabbu API and neatly retrieves your files and folders scattered online.

## Supported Providers

- **Hard drive**
- **Google drive**
- **Gmail**
- **One drive**

_And more to come...!_

### Creating a new provider

If you want to create a new provider, please file an issue using the `New provider` template [here](https://github.com/dabbu-knowledge-platform/files-api-server/issues/new/choose). This is only to let us know that you want to work on the provider and how you plan to go about it.

Please read [contributing](./contributing) for a detailed guide to setting up your environment and making changes to the code.

Also, if you need any help on the code, please do ask on [this](https://github.com/dabbu-knowledge-platform/files-api-server/discussions/categories/want-to-contribute) Github discussion. We will only be glad to help :)

## Docs

The documentation for the server can be found on the [website](https://dabbu-knowledge-platform.github.io/impls/server). The source can be found [here](https://github.com/dabbu-knowledge-platform/dabbu-knowledge-platform.github.io/blob/main/impls/server.md).

## Issues and pull requests

You can contribute to Dabbu by reporting bugs, fixing bugs, adding features, and spreading the word! If you want to report a bug, create an issue by clicking [here](https://github.com/dabbu-knowledge-platform/files-api-server/issues/new/choose). While creating an issue, try to follow the Bug report or Feature request template.

Please read [contributing](./contributing) for a detailed guide to setting up your environment and making changes to the code.

## Legal stuff

### License - GNU GPL v3

Dabbu Files API Server - An implementation of the Dabbu Files API that
enables you to access your files, folders and emails stored with
multiple providers as simple files and folders, all in one place!

Copyright (C) 2021 gamemaker1

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
