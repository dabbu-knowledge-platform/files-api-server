## Features

- Added Basic HTTP Authentication
  - all clients need to 'register' themselves with the server by making a `POST` request to the `/clients` endpoint
    - this returns a client ID - API key pair that must be sent in all subsequent requests in the `X-Credentials` header encoded as follows: `base64(<client id>:<api key>)`
    - provider-specific credentials like access tokens can be sent in the `X-Provider-Credentials` header
  - API keys can be replaced by making a `POST` request with the current API key to the `/clients/:clientId` endpoint
    - this returns the current client ID and a new API key
  - The client can be deleted by making a `DELETE` request to `/clients/:clientId` endpoint

## Changes

- Typescript rewrite
- Provider ID (`googledrive`, `gmail` or `onedrive`) is now to be specified as a query parameter (`providerId`)
- Don't lazy load providers, load them once and use them as required
- Use ISO timestamp strings instead of epoch timestamps
- Add helmet middleware for basic security
- Add a logger
  - Logs are stored locally ONLY, in the config directory
    - Windows: %APPDATA%\Dabbu Files API Server\logs\files-api-server.log
    - MacOS: /Users/<username>/Library/Dabbu Files API Server/logs/files-api-server.log
    - Linux: ($HOME OR $XDG_CONFIG_HOME)/.config/Dabbu Files API Server/logs/files-api-server.log
  - These logs contain sensitive information, please be careful to remove sensitive information while posting them publicly. Work is underway to mask this sensitive information.

## Fixes

- Improved error messages are returned
- Google Drive provider now returns proper export links for Google Workspace files
- One Drive provider returns an error if attempting to download OneNote files. A parser for OneNote files is in progress

## Docs

- Add API docs and provider-specific docs
- Add guide for running server on your own
- WIP: getting started guide for using the APIs in your own client

## Builds/CI

- Automatic releases only from the develop branch
- Add bash scripts for all jobs

## Tests

- Use jest for tests
  - Add unit tests for all providers and routes.
  - Tests for controllers and utils are not yet implemented, PRs welcome.

## Style/Format

- Add ts files to .editorconfig
- Use ESLint to lint typescript files
