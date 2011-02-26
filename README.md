MooTools FileManager
====================

A filemanager for the web based on MooTools that allows you to (pre)view, upload and modify files and folders via your browser.

![Screenshot](https://github.com/frozeman/mootools-filemanager/raw/master/screenshot.png)

### Authors
* [Christoph Pojer](http://cpojer.net)
* [Fabian Vogelsteller](http://frozeman.de)

### Features

* Browse through Files and Folders on your Server
* Rename, Delete, Move (Drag&Drop), Copy (Drag + hold CTRL) and Download Files
* View detailed Previews of Images, Text-Files, Compressed-Files or Audio Content
* Nice User Interface ;)
* Upload Files via FancyUpload (integrated Feature)
* Option to automatically resize big Images when uploading
* Use it to select a File anywhere you need to specify one inside your Application's Backend
* Use as a FileManager in TinyMCE or CKEditor
* Provides your client with the most possible convenience
* Create galleries using the Gallery-Plugin
* History and state management

### Issues
  - sometimes "illegal character (Error #2038) mootools-core-1.3.js (line 5015)" when uploading multiple files

How to use
----------

### Demos

* Open the "Demos/" folder and have fun

### Installation

* First you need to include the follwing scripts
  * Source/FileManager.js
  * Source/Uploader/Fx.ProgressBar.js
  * Source/Uploader/Swiff.Uploader.js
  * Source/Uploader.js
  * Source/Gallery.js (if you want to create a gallery, see example in the Demos/index.html)
  * Language/Language.en.js (or the language(s) do you need)

* Then you need to modify the "Demos/manager.php" or "Demos/selectImage.php" to set up your upload folder etc
* See the "Demos/index.html" for examples, but basically you need to do the following:

      var myFileManager = new FileManager({
        url: 'path/to/the/manager.php',
        assetBasePath: '../Assets'
      });
      myFileManager.show();

### Configurable Options

Options

* url: (string) The base url to a file with an instance of the FileManager php class (FileManager.php), without QueryString
* assetBasePath: (string) The path to all images and swf files used by the filemanager
* directory: (string, relative to the directory set in to the filemanager php class) Can be used to load a subfolder instead of the base folder
* language: (string, defaults to *en*) The language used for the FileManager
* selectable: (boolean, defaults to *false*) If true, provides a button to select a file
* destroy: (boolean, defaults to *false*) Whether to allow deletion of files or not
* rename: (boolean, defaults to *false*) Whether to allow renaming of files or not
* download: (boolean, defaults to *false*) Whether to allow downloading of files or not
* createFolders: (boolean, defaults to *false*) Whether to allow creation of folders or not
* filter: (string) If specified, it reduces the shown and upload-able filetypes to these mimtypes. possible options are
  * image: *.jpg; *.jpeg; *.bmp; *.gif; *.png
  * video: *.avi; *.flv; *.fli; *.movie; *.mpe; *.qt; *.viv; *.mkv; *.vivo; *.mov; *.mpeg; *.mpg; *.wmv; *.mp4
  * audio: *.aif; *.aifc; *.aiff; *.aif; *.au; *.mka; *.kar; *.mid; *.midi; *.mp2; *.mp3; *.mpga; *.ra; *.ram; *.rm; *.rpm; *.snd; *.wav; *.tsi
  * text: *.txt; *.rtf; *.rtx; *.html; *.htm; *.css; *.as; *.xml; *.tpl
  * application: *.ai; *.bin; *.ccad; *.class; *.cpt; *.dir; *.dms; *.drw; *.doc; *.dvi; *.dwg; *.eps; *.exe; *.gtar; *.gz; *.js; *.latex; *.lnk; *.lnk; *.oda; *.odt; *.ods; *.odp; *.odg; *.odc; *.odf; *.odb; *.odi; *.odm; *.ott; *.ots; *.otp; *.otg; *.pdf; *.php; *.pot; *.pps; *.ppt; *.ppz; *.pre; *.ps; *.rar; *.set; *.sh; *.skd; *.skm; *.smi; *.smil; *.spl; *.src; *.stl; *.swf; *.tar; *.tex; *.texi; *.texinfo; *.tsp; *.unv; *.vcd; *.vda; *.xlc; *.xll; *.xlm; *.xls; *.xlw; *.zip;
* hideClose: (boolean, defaults to *false*) Whether to hide the close button in the right corner
* hideOnClick: (boolean, defaults to *false*) When true, hides the FileManager when the area outside of it is clicked
* hideOverlay: (boolean, defaults to *false*) When true, hides the background overlay

Options if Uploader is included

* upload: (boolean, defaults to *true*) 
* uploadAuthData: (object) Data to be send with the GET-Request of an Upload as Flash ignores authenticated clients
* resizeImages: (boolean, defaults to *true*) Whether to show the option to resize big images or not

Events

* onComplete(path, file): fired when a file gets selected via the "Select file" button
* onModify(file): fired when a file gets renamed/deleted or modified in another way
* onShow: fired when the FileManager opens
* onHide: event fired when FileManager closes
* onPreview: event fired when the user clicks an image in the preview

Backend

* See Backend/FileManager.php for all available server-side options

### Custom Authentication

* As Flash and therefore the Uploader ignores authenticated clients you need to specify your own authentication. In order to do this you need to provide a custom "UploadIsAuthenticated" function on the serverside and you need to specify "uploadAuthData" on the client.

### Credits
Loosely based on a Script by [Yannick Croissant](http://dev.k1der.net/dev/brooser-un-browser-de-fichier-pour-mootools/)
