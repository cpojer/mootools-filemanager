/*
Script: FileManager.js
	MooTools FileManager for integration with [TinyMCE](http://tinymce.moxiecode.com/) 

License:
	MIT-style license.

Copyright:
	Copyright (c) 2009 [Christoph Pojer](http://og5.net/christoph).

Dependencies:
	- FileManager.js

Usage:
	- Pass this to the "file_browser_callback"-option of TinyMCE:
		FileManager.TinyMCE(function(){ return {FileManagerOptions}; });
	- See the Demo for an example.
*/

FileManager.TinyMCE = function(options){
	return function(field, url, type, win){
		var manager = new FileManager($extend({
			onComplete: function(path){
				if(!win.document) return;
				win.document.getElementById(field).value = path;
				if(win.ImageDialog) win.ImageDialog.showPreviewImage(path, 1);
				this.container.destroy();
			}
		}, options(type)));
		manager.el.setStyle('zIndex', 400001);
		manager.overlay.el.setStyle('zIndex', 400000);
		manager.show();
	};
};

FileManager.implement('SwiffZIndex', 400002);

var Dialog = new Class({
	
	Extends: Dialog,
	
	initialize: function(text, options){
		this.parent(text, options);
		this.el.setStyle('zIndex', 400010);
		this.overlay.el.setStyle('zIndex', 400009);
	}
	
});