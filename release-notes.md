## Features added

### Google Drive

- Add support for handling shortcut files [233935cc]
	- If a request is made with exportType = 'view', then the shortcut name, the target file's mime type and a link to open the shortcut with Google Drive in the web browser will be returned
	- If a request is made with exportType = 'media', or a mime type to export a file, then the target file's name, the target file's mime type and an export/download link for the target file will be returned (Access token required to export/download file)
- Auto-append extension (docx, xlsx, pptx, etc.) if the file is a Google Workspace file [d7593ba]

## Fixes

### Google Drive

- Google Drive returns wrong export link for Google Workspace files [673b352]
