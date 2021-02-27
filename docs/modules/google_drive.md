---
layout: home
title: Google Drive
nav_order: 15
parent: Provider Modules
---

# Google Drive

## Provider specific fields

Requires an access token of the format `Bearer <token>` added to the header under the `Authorization` header field in every request. No fields need to be added to the request body.

## Google Drive specific features

- Currently, it is only possible to view and download files and folders shared with you (located in the hidden `/Shared` folder). Files and folders that you have shared with others will appear in their respective paths in your Drive. Sharing files and folders with others is not yet supported through this server module.
- Updating and creating shared files is also not supported.
