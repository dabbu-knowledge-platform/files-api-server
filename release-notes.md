## Bug fixes

### Google Drive and Gmail

- Remove forward slashes from file names, replace them with pipes [04bdf0b]
  - otherwise while copying to other providers like hard drive or one drive that use forward slashes to separate file and folder names, an error would occur
  - fixes #42

## Documentation

- Make readme more consice, update links [4cd9bf7, c376093, 0c6b2ea]
  - documentation now moved to github pages site

## Builds/CI

- Add colours and .sh extensions to scripts [357a258]
- Fix version bump script not working [f50cb68]

## Maintenance

- Upgrade packages to latest versions [68cd00f, edf9836]
