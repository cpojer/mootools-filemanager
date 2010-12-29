MooTools FileManager - Copyright (c) 2009 [Christoph Pojer](http://og5.net/christoph)
=====================================================================================

A filemanager for the web based on MooTools that allows you to (pre)view, upload and modify files and folders via your browser.

![Screenshot](https://github.com/frozeman/mootools-filemanager/raw/master/screenshot.png)

### Version
  1.1 rc3

### Author
 [Christoph Pojer](http://og5.net/christoph)

### Features

* Browse through Files and Folders on your Server
* Rename, Delete, Move (Drag&Drop), Copy (Drag + hold CTRL) and Download Files
* View detailed Previews of Images, Text-Files, Compressed-Files or Audio Content
* Nice User Interface ;)
* Upload Files via FancyUpload (integrated Feature)
* Option to automatically resize big Images when uploading
* Use it to select a File anywhere you need to specify one inside your Application's Backend
* Use as a FileManager in TinyMCE
* Provides your client with the most possible convenience ( ;D )
* Create galleries using the Gallery-Plugin

### ToDo
  - fix flash issue in IE (somewhere in fancy uploader)
  - port to mootools 1.3

How to use
----------

### Demos

* Open the "Demos/" folder and have fun
* To test TinyMCE Download and extract it to "Demos/TinyMCE" and access "Demos/tinymce.html"
* Demo of 1.0rc2 (old): http://cpojer.net/Scripts/FileManager/Demos/

### Configurable Options

* See Source/FileManager.js and Backend/FileManager.php for all available options on the client- and server-side

### Installation

* See "Demos/index.html" for the clientside integration
* See "Demos/manager.php" or "Demos/selectImage.php" for serverside integration

### Custom Authentication

* As Flash and therefore the Uploader ignores authenticated clients you need to specify your own authentication. In order to do this you need to provide a custom "UploadIsAuthenticated" function on the serverside and you need to specify "uploadAuthData" on the client.


### Changes
 - [James Ehly](http://www.devtrench.com)
    - thumbnail list
 - [Fabian Vogelsteller](http://frozeman.de)
    - extended thumbnails
    - now absolute and relative paths are possible
    - add clickable and selectable path in the header
    - add hiding of the thumbnail directory
    - a lot of bugfixes
    - add .htaccess to allow upload and resize of big files
    - made interface changes
    - add SqueezBox for preview of the images
    - add keyboard navigation in the file browser
