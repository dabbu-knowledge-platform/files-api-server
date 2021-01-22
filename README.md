# Dabbu Server

A unified API platform to access your emails, photos, and chats as simple files and folders.

## Intro

Tired of having your files and folders randomly scattered about online with multiple companies from Google to Dropbox? Want to access your Google Drive or OneDrive as fast and easily as your hard drive? Well, that's exactly what we have tried doing with Dabbu. We'll let this GIF do the talking:

![](./media/DabbuCLI.gif)

What you just saw there was Dabbu CLI in action - a simple program in javascript that leverages the Dabbu API to bring your files and folders at your fingertips from all over the web.

**This repo contains the server application that handles API calls from clients. The source for the CLI app demoed in the GIF above can be found [here](https://github.com/gamemaker1/dabbu-cli)**

## Getting started

The installation can be done manually on Linux, MacOS, Android (Requires Termux) and Windows.

**Requirements:**
- `git` could be installed (or you could download the source code as a zip file and extract it).
  - To check if git is already installed, type `git --version` in terminal/command prompt. You should see a version number displayed after running this command.
  - [Here](https://github.com/git-guides/install-git) are the official instructions to install git for all platforms in case you haven't installed it already.
- `nodejs and npm` **must** be installed for the server to run.
  - To check if git is already installed, type `node --version && npm --version` in terminal/command prompt. You should see two version numbers displayed after running this command.
  - [Here](https://nodejs.org/en/download/package-manager/) are the official instructions to install nodejs and npm for all platforms in case you haven't installed it already.

**Install steps:**
- Open a terminal/command prompt.
- Download source through one of these two methods:
  - If you are using git to get the source code, run this in an empty folder (the code will be downloaded to this folder): `git clone https://github.com/gamemaker1/dabbu-server .` [Notice the full stop at the end]
  - If you don't want to or can't install git, 
- Then type in `npm install`. This will install all the dependencies.
- Then type in `npm start`. This will start the server. Yay!

**Next steps:**
Here is something you can do after succesfully setting up the server.
- Once the server is started using `npm start`, it should show you the following output:
  ```
    > dabbu-server@1.0.0 start /path/to/code/dabbu
    > node src/server.js

   INFO Dabbu Server v1.0.0
   INFO Server listening on port 8080
  ```
- Go to http://localhost:8080/. You will see the text `Dabbu Server running on port 8080` on the page. If not, try running the server again or check if you have missed a step. If the problem persists, post a message on [Github discussions](https://github.com/gamemaker1/dabbu-server/discussions/categories/q-a) asking for help. We'll only be glad to help you :)
- Now you can download a client program to run Dabbu! Here is a list of clients and links to their documentation and install instructions:
  - [**Dabbu CLI**](https://github.com/gamemaker1/dabbu-cli)

**Advanced:**
If you want to install the dependencies only for certain providers and not all of them, follow these steps:
- After getting the source code from git/a zip file, instead of running `npm install`, run `npm install --only=production`. This will install only those depencies that the server requires to run, namely `express` and `multer`.
- Then check the READMEs of the modules (located at docs/modules/provider_id.md). You will find the commands you need to run to install the individual modules' dependency. 
- Run them, and you will have successfully installed dependencies for only the modules you want.

If you want to enable/disable certain providers, follow these steps:
- Open the config file using a text editor like Notepad or GEdit.
- In the file, you will see that the 2nd line has the field `providers`.
- Below that, you will see a list of provider IDs like `hard_drive`, `google_drive`, etc. Delete the lines which contain the providers you do not want to enable. Also, take care that each line (except the last one) ends with a comma.

If you want to change the port of the server, follow these steps:
- Open the config file using a text editor like Notepad or GEdit.
- In the file, you will see that the 4th last line has the field `port`.
- The default value is 8080. You may, however, change that value to whatever you want (unless **REALLY** required, please keep it the same).

Here is a sample config file with all providers enabled that will run the server on port 8080 of your computer:
```JSON
{
  "providers": [
    "hard_drive",
    "google_drive"
  ],
  "runtime": {
    "port": 8080,
    "debug": true
  }
}
```

## Supported Providers
- [**Hard drive**](./docs/modules/hard_drive.md)
- [**Google drive**](./docs/modules/google_drive.md)

*And more to come...!*

### Creating a new provider

**Note: If you want to create a new provider, please file an issue using the `New provider` template [here](https://github.com/gamemaker1/dabbu-server/issues/new/choose). This is only to let us know that you want to work on the provider and how you plan to go about it. Also, if you need any help on the code, please do ask on [this](https://github.com/gamemaker1/dabbu-server/discussions/categories/want-to-contribute) Github discussion. We will only be glad to help :)**

## Docs

The API documentation is in the file [docs/APIs.md](./docs/APIs.md)

The code structure is documented in the file [docs/Code.md](./docs/Code.md)

## Issues and pull requests

### Issues

You can contribute to Dabbu by reporting bugs, fixing bugs, adding features, and spreading the word! If you want to report a bug, create an issue by clicking [here](https://github.com/gamemaker1/dabbu-server/issues/new/choose). While creating an issue, try to follow the Bug report or Feature request template.

### Pull requests

#### Setting up your local environment

**Step 0: Install `git`, `nodejs` and `npm`**

- `git` **must** be installed to make pull requests and push changed code.
  - To check if git is already installed, type `git --version` in terminal/command prompt. You should see a version number displayed after running this command.
  - [Here](https://github.com/git-guides/install-git) are the official instructions to install git for all platforms in case you haven't installed it already.
- `nodejs and npm` **must** be installed for the server to run.
  - To check if git is already installed, type `node --version && npm --version` in terminal/command prompt. You should see two version numbers displayed after running this command.
  - [Here](https://nodejs.org/en/download/package-manager/) are the official instructions to install nodejs and npm for all platforms in case you haven't installed it already.

**Step 1: Fork**

Fork the project [on the GitHub website](https://github.com/gamemaker1/dabbu-server) and clone your fork locally.

Run the following to clone your fork locally:

```sh
$ git clone https://github.com/<your-username>/dabbu-server
$ cd dabbu-server
$ git remote add upstream https://github.com/gamemaker1/dabbu-server.git
$ git fetch upstream
```

**Step 2: Build**

All you need to do to build is run `npm install`. To run, type in `npm start`.

Once you've built the project locally, you're ready to start making changes!

**Step 3: Branch**

To keep your development environment organized, create local branches to hold your work. These should be branched directly off of the `main` branch. While naming branches, try to name it according to the bug it fixes or the feature it adds.

```sh
$ git checkout -b my-branch-name -t upstream/main
```

**Step 4: Code**

To get a decent idea of how the code is organised and what happens where, read [this](./docs/Code.md) file. Also, the code is heavily commented to allow you to understand exactly what happens. Remember to also read through the [Code Style Guidelines](./docs/CodeStyles.md) before starting to write code.

**Step 5: Commit**

It is recommended to keep your changes grouped logically within individual commits. Many contributors find it easier to review changes that are split across multiple commits. There is no limit to the number of commits in a pull request.

```sh
$ git add my/changed/files
$ git commit
```

Note that multiple commits often get squashed when they are landed.

**Commit message guidelines**

A good commit message should describe what changed and why. This project uses [semantic commit messages](https://conventionalcommits.org/) to streamline
the release process.

Before a pull request can be merged, it **must** have a pull request title with a semantic prefix.

Examples of commit messages with semantic prefixes:

- `fix: don't reload config everytime`
- `feat: add MS OneDrive provider`
- `docs: fix typo in APIs.md`

Common prefixes:

- `fix`: A bug fix
- `feat`: A new feature
- `docs`: Documentation changes
- `perf`: A code change that improves performance
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `style`: Changes that do not affect the meaning of the code (linting)
- `vendor`: Bumping a dependency like node or express

Other things to keep in mind when writing a commit message:

- The first line should:
  - contain a short description of the change (preferably 50 characters or less, and no more than 72 characters)
  - be entirely in lowercase with the exception of proper nouns, acronyms, and the words that refer to code, like function/variable names
- Keep the second line blank.
- Wrap all other lines at 72 columns.

**Breaking Changes**

A commit that has the text `BREAKING CHANGE:` at the beginning of its optional body or footer section introduces a breaking API change (correlating with Major in semantic versioning). A breaking change can be part of commits of any type, e.g., a `fix:`, `feat:` & `chore:` types would all be valid, in addition to any other type.

See [conventionalcommits.org](https://conventionalcommits.org) for more details.

**Step 6: Rebase**

Once you have committed your changes, it is a good idea to use `git rebase` (*NOT `git merge`*) to synchronize your work with the main repository.

```sh
$ git fetch upstream
$ git rebase upstream/main
```

This ensures that your working branch has the latest changes from `gamemaker1/dabbu-server` main.

**Step 7: Test**

Bug fixes and features should always come with tests. Please test your own code adequately. Also, before finally pushing your code, clone it into a fresh environment (different user or maybe a different computer) and make sure it works just as fine.

**Step 8: Push**

Once your commits are ready to go - with adequate testing - begin the process of opening a pull request by pushing your working branch to your fork on GitHub.

```sh
$ git push origin my-branch-name
```

**Step 9: Opening the Pull Request**

From within GitHub, opening a new pull request will present you with a template that should be filled out.

**Step 10: Discuss and update**

You will probably get feedback or requests for changes to your pull request. This is a big part of the submission process so don't be discouraged! Some contributors may sign off on the pull request right away. Others may have detailed comments or feedback. This is a necessary part of the process in order to evaluate whether the changes are correct and necessary.

To make changes to an existing pull request, make the changes to your local branch, add a new commit with those changes, and push those to your fork. GitHub will automatically update the pull request.

```sh
$ git add my/changed/files
$ git commit
$ git push origin my-branch-name
```

There are a number of more advanced mechanisms for managing commits using `git rebase` that can be used, but are beyond the scope of this README.

Feel free to post a comment in the pull request to ping reviewers if you are awaiting an answer on something.

**Approval and Request Changes Workflow**

All pull requests require approval from a [Code Owner](https://github.com/dabbu-server/blob/main/.github/CODE_OWNERS) of the area you modified in order to land. Whenever a maintainer reviews a pull request they may request changes. These may be small, such as fixing a typo, or may involve substantive changes. Such requests are intended to be helpful, but at times may come across as abrupt or unhelpful, especially if they do not include concrete suggestions on *how* to change them. 

Try not to be discouraged. Try asking the maintainer for advice on how to implement it. If you feel that a review is unfair, say so or seek the input of another project contributor. Often such comments are the result of a reviewer having taken insufficient time to review and are not ill-intended. Such difficulties can often be resolved with a bit of patience. That said, reviewers should be expected to provide helpful feedback.

**Step 11: Landing**

In order to land, a pull request needs to be reviewed and approved by at least one Code Owner. After that, if there are no objections from other contributors, the pull request can be merged.

**Congratulations and thanks a lot for your contribution!**

## Legal stuff

**License - GNU GPL v3**

Dabbu Server - a unified API to retrieve your files and folders stored online
Copyright (C) 2021  gamemaker1

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
