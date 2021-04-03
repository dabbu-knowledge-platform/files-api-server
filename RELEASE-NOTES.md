## Changes to server

- refactor(server): separate server from arg parsing [fcda907]
	- server is now created in app.js: it exposes a function to create
	a server on the given port with the given providers
	- server.js was renamed to index.js, handles arg parsing
	- axios imports modified to import axios.default
	- add option to disable console output
	- store port in env variable DABBU_FILES_API_SERVER_PORT
	- correct case of 400 error (malformedURL => malformedUrl)

- feat: change provider IDs from snake case to normal case [a02bd81]
	- **BREAKING CHANGE:** provider IDs now have dashes separating words instead of underscores
	- all JSON variables are now expected to have dashes separating words instead of underscores
	- URL changed to /files-api/v2

## Bug fixes

- fix(google drive, one drive): return null if nothing is updated on PUT call [31281ed]
- fix(hard drive): return 404 if file was not found [73c6d28]
	- previously it returned a 500, relying on native fs api to return an error if the file didn't exist
	- moved check for base_path to the top, it is now checked before the folder path
- fix(errors): change unauthorized status code to 401 [c5209d6]
- fix(hard drive): throw error if base path is missing [c210a81]
- fix(utils): ordering function in sortFiles [52b7d30]
	- it was returning asc for desc and desc for asc

## Build/CI changes

- ci: create prereleases on push to develop [f707e46, a829516]
	- the prereleases will only be created when version number is changed
	- it will contain a dash if it is a prerelease, i.e., 3.0.0-alpha.1
- ci: use release notes from RELEASE-NOTES instead of CHANGELOG [54f5a50]
- build: add scripts to bump version, generate release notes and push to git [4ec58f8]
	- usage: scripts/bump-version [<new-version> | major | minor | patch | premajor | preminor | prepatch | prerelease]
	- to be run from project root

## Code format/style changes

- style: add editorconfig file [92474cc]
- style: run prettier through xo [84b4196, b11a58c]
- style: switch from prettier to xo [0ac7e22]
	- xo adds its own linter, had to disable a few rules
	to accomodate our conventions
	- switched from 2 spaces to tabs
	- disabled complexity, no-unused-vars, max-params,
	max-depth, unicorn/no-nested-ternary and accepted snake
	case for file names
	- changed docs to mention use of xo

## Documentation

- docs(contributing): add instructions for tests [dbe6f22]
- docs(contributing): add instructions regarding branch naming and merging [caf8079]
- docs(readme): add badges for code style, supported platforms (ci was already there) [b11a58c]

## Testing

- test(util): add test for sortFiles function [52b7d30]
- test: add framework for testing server [0c70860]
	- add ava, form-data as dev dependencies
	- add basic tests for server, utils and each provider module
	- add sample files to test get, post, put, etc.
	- modify npm test to run tests using ava
	- modify ci to run tests before building
	- remove dev deps from executable
	- add test instructions to CONTRIBUTING.md
