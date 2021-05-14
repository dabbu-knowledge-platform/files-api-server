## Hosting the Files API Server

### Using the prebuilt executables (recommended)

Prebuilt executables can be found on the [releases page](https://github.com/dabbu-knowledge-platform/files-api-server/releases) of the Files API Server repository. Please download the appropriate executable to your server and run it. 

On Windows, you can run the executable by double clicking on it.

On Linux/MacOS, you may need to mark the file as an executable. Do this by opening the command prompt and typing:

```
chmod +x /path/to/file
```

Then run the file by simply double-clicking on it, or by typing the path to it in terminal.

### Using the latest source

To run the server using the [latest source code from github](https://github.com/dabbu-knowledge-platform/files-api-server/), you require `git`, `nodejs` and `yarn` installed.

#### Git

`git` **must** be installed to pull the latest source code.

- To check if git is already installed, type `git --version` in terminal/command prompt. You should see a version number displayed after running this command.
- [Here](https://github.com/git-guides/install-git) are the official instructions to install git for all platforms in case you haven't installed it already.

#### NodeJS and Yarn

`nodejs` and `yarn` **must** be installed to run the CLI locally.

- To check if NodeJS and Yarn already installed, type `node --version && yarn --version` in terminal/command prompt. You should see two version numbers displayed after running this command. For developing Dabbu Files API Server, we use the latest version of Typescript, which compiles to CommonJS code.
- [Here](https://nodejs.org/en/download/package-manager/) are the official instructions to install NodeJS and Yarn for all platforms in case you haven't installed it already.

Once `git`, `nodejs` and `yarn` are installed, clone the repository using the following command:

```
git clone https://github.com/dabbu-knowledge-platform/files-api-server.git
```

Then make sure you are on the `develop` branch:

```
git checkout develop
```

Next, start the server:

```
yarn start:prod
```

This will start the server on a random port if the `PORT` environment variable is null. To set the `port` on which the server is running, run the following:

```
env PORT=<port number> yarn start:prod
```

This should start the server on the specified \<port number\>.