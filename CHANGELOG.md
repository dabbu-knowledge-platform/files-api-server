### Changes to server

- Separate server code from argument parsing

### Provider specific changes

#### Hard Drive

**Bug fixes:**

- return 404 instead of 500 if file was not found 73c6d28
- throw error if base_path is missing c210a81

### Code Style

- Add `XO` as linter 0ac7e22
- Run `prettier` through `XO` to format files b11a58c

### Testing

- Add test framework (`ava`) 0c70860


### Builds and CI

- Add support for prereleases from the `develop` branch f707e46

### Documentation

- Add badges to README
- Update CONTRIBUTING instructions
