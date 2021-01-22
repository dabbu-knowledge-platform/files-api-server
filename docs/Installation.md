# Installation Guide for Dabbu Server

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
  - If you don't want to or can't install git, go to [the Github repository](https://github.com/gamemaker1/dabbu-server) in a web browser. Then download the repository as a zip file by pressing the green code button at the top right.
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