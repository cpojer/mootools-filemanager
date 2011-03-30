/*
---

description: MooTools FileManager for integration with [TinyMCE](http://tinymce.moxiecode.com/)

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/*]

provides: FileManager.TinyMCE

Usage:
  - Pass this to the "file_browser_callback"-option of TinyMCE: FileManager.TinyMCE(function(){ return {FileManagerOptions}; });
  - See the Demo for an example.
...
*/

FileManager.TinyMCE = function(options){
  /*
   * field: Id of the element to set value in.
   * url: value currently stored in the indicated element
   * type: Type of browser to open image/file/flash: 'file' ~ page links, 'image' ~ insert picture, 'media' ~ insert media/movie
   * win: window object reference
   */
  return function(field, url, type, win){
    var manager = new FileManager(Object.append({
      onComplete: function(encoded_path, file, legal_file_path, current_dir, full_file_path) {
        if (!win.document) return;
        win.document.getElementById(field).value = full_file_path;
        if (win.ImageDialog) {
			win.ImageDialog.showPreviewImage(full_file_path, 1);
		}
        this.container.destroy();
      }
    }, options(type)));
    manager.dragZIndex = 400002;
    manager.SwiffZIndex = 400003;
    manager.filemanager.setStyle('width','90%');
    manager.filemanager.setStyle('height','90%');
    manager.filemanager.setStyle('zIndex', 400001);
    if (manager.overlay) manager.overlay.el.setStyle('zIndex', 400000); // i.e. only do this when FileManager settings has 'hideOverlay: false' (default)
    document.id(manager.tips).setStyle('zIndex', 400010);
    manager.show();
    return manager;
  };
};

FileManager.implement('SwiffZIndex', 400003);

var Dialog = new Class({

  Extends: Dialog,

  initialize: function(text, options){
    this.parent(text, options);
    this.el.setStyle('zIndex', 400010);
    this.overlay.el.setStyle('zIndex', 400009);
  }

});

