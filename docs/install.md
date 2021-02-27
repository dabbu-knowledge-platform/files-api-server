---
layout: home
title: Installation and setup
nav_order: 2
---

# Installation and setup

The Dabbu Server is bundled into a single executable file. It is cross-compiled for Linux, MacOS and Windows.

The server accepts requests from clients, interfaces with various providers and returns the requested data to the client. There is a public instance of the server running on [Heroku](https://dabbu-server.herokuapp.com/), but it is recommended (and very easy) to download it to your computer and run it.

### Installation

To install the server on your computer, you can simply download the latest version of the server [here](https://github.com/gamemaker1/dabbu-server/releases/latest).

### Running it on your computer

On Windows, simply double click the file to run it (it will be a `.exe`).

On Linux/MacOS, mark the file as an executable by running `chmod u+x path/to/file`. Then simply type in the path to the file in Terminal.

Once the server is up and running, open up the URL [https://localhost:8080](https://localhost:8080) on your browser. It should show you the text `Dabbu Server running on port 8080`.

### Apps (clients) that use the Dabbu API

Now you can download a client that uses the Dabbu API to interact with your files and folders. Here is a list of clients that use the Dabbu API to interact with your files and folders:

- [**Dabbu CLI**](https://github.com/gamemaker1/dabbu-cli) - A CLI that leverages the Dabbu API and neatly retrieves your files and folders scattered online.

### Providers supported by Dabbu

Here is a list of providers supported by Dabbu:

- **Hard drive**
- **Google drive**
- **Gmail**
- **One drive**