## Features added

- feat(list api): implement pagination [601bd83]
	- all providers (except hard drive) now return a nextSetToken in
	the response
	- the maximum number of results at once is 50, can be changed using
	the limit query parameter (recommended is default, 50)
	- they also accept a nextSetToken in the query parameters to get
	results from a certain point
- fix(arg parsing): cast port to integer if specified [2a22d3e]

## Provider specific changes

### Gmail

- feat(gmail): add ability to list all mail using ALL_MAIL label [f6950f3]

## Builds/CI

- fix(scripts): copy bump version script from cli repo [f8f8a67]
- ci: change method for detecting prereleases [cff5bc0]
	- delete CHANGELOG.md, as it is no longer used

- style: rename readme, contributing, release notes to have .md ext [7afd270]
- style: rename readme, contributing, release notes to lower case [d7c3867]
