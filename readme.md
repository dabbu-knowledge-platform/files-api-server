# Dabbu Files API Server

[![NodeJS CI](https://github.com/dabbu-knowledge-platform/files-api-server/actions/workflows/ci.yaml/badge.svg)](https://github.com/dabbu-knowledge-platform/files-api-server/actions/workflows/ci.yaml) [![Platforms: Alpine Linux MacOS Windows](https://img.shields.io/badge/platforms-alpine%20linux%20macos%20windows-blue)](https://img.shields.io/badge/platforms-windows%20linux%20macos%20alpine-blue)

With the Dabbu Knowledge Platform, we aim to rethink the way we organize and traverse large amounts of knowledge, no matter where it is stored.

Dabbu allows you to access any of your personal information (Gmail, Google Drive, OneDrive, your hard drive, ...) as simple files and folders from Dabbu CLI.

It not only allows you to seamlessly search/traverse your information across these sources (as simple as `cd`, `list`), but also move information around between drives (`copy`) - yes even your Gmail messages in a thread get copied to your hard drive as `.md` files in a zip if you do a `c:/$ cp m:/INBOX/* ./"My Emails"`.

You can also go into the special knowledge drive where you can pivot information by topics/people/places e.g. `k:/$ cd austin` (will return you all your information from Gmail, Google Drive, OneDrive that has a reference to the place Austin). You can further narrow your search by doing `k:/austin$ cd ravi@example.com` (yes it even extracts people and allows you to pivot information by them). This would show you all emails and files that are related to Austin and from/to ravi@example.com.

All of this has been implemented by abstracting access to providers (you can add more providers as modules) and exposing a unified API for information (no matter where and what form it takes).

The only way to use Dabbu (at the moment) is through a command-line interface (CLI). A desktop app is in the works.

### This is an implementation of the Dabbu Files API. This repository does not house the code for the CLI. Information on the CLI, including installation process and setup, can be found [here](https://dabbu-knowledge-platform.github.io).

## Using the Files API Server

The Files API Server can be used in any application to access the user's files and folders. Some providers require the user to authorize the app using OAuth 2.0. To get started on using the Files API Server in your app, look at the [getting started guide](./docs/getting-started.md) (Work in progress, though [API documentation](./docs/api/) is complete).

## Providers supported

- [**Google drive**](https://github.com/dabbu-knowledge-platform/files-api-server/blob/develop/docs/providers/googledrive.md)
- [**Gmail**](https://github.com/dabbu-knowledge-platform/files-api-server/blob/develop/docs/providers/gmail.md)
- [**One Drive**](https://github.com/dabbu-knowledge-platform/files-api-server/blob/develop/docs/providers/onedrive.md)

To request a new provider, file an issue [here](https://github.com/dabbu-knowledge-platform/files-api-server/issues/new/choose).

## Issues and pull requests

You can contribute to Dabbu by reporting bugs, fixing bugs, adding features, and spreading the word! If you want to report a bug, create an issue by clicking [here](https://github.com/dabbu-knowledge-platform/files-api-server/issues/new/choose). While creating an issue, try to follow the Bug report or Feature request template.

Please read [contributing.md](./contributing.md) for a detailed guide to setting up your environment and making changes to the code.

Also, if you need any help on the code, please do ask on [this](https://github.com/dabbu-knowledge-platform/files-api-server/discussions/readegories/want-to-contribute) Github discussion. We will only be glad to help :)

## Legal stuff

### License - GNU GPL v3

All projects of the Dabbu Knowledge Platform are copyrighted (C) 2021 Dabbu Knowledge Platform <dabbuknowledgeplatform@gmail.com> and licensed under the GNU GPLv3 license. See [license.md](./license.md) for a copy of the license file.
