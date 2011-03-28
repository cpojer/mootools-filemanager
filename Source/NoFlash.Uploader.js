/*
---

description: Implements Upload functionality into the FileManager without using Flash
             While the flash uploader is preferable, sometimes it is not possible to use it due to 
             server restrictions (eg, mod_security), or perhaps users refuse to use flash.
             
             This Upload handler will allow the MFM to continue to function, without multiple-upload-at-once
             function and without progress bars.  But otherwise, it should, work.
             
authors: James Sleeman (@sleemanj)

license: MIT-style license.

requires: [Core/*]

provides: Filemanager.Uploader

...
*/

FileManager.implement({

  options: {
    resizeImages: true,
    upload: true,
    uploadAuthData: {}
  },

  hooks: {
    show: {
      upload: function() {
        this.startUpload();
      }
    },

    cleanup: {
      upload: function(){
        if (!this.options.upload  || !this.upload) return;

        try { if (this.upload.uploader) this.upload.uploader.set('opacity', 0).dispose(); } catch(e) { }
      }
    }
  },

  onDialogOpenWhenUpload: function(){
    
  },

  onDialogCloseWhenUpload: function(){
    
  },

  startUpload: function(){

    if (!this.options.upload || typeof this._dummyframe != 'undefined') return;
    
    var mfm = this;
    var f = (new Element('form'))
      .set('action', this.options.url + 'event=upload')
      .set('method', 'post')
      .set('enctype', 'multipart/form-data')
      .set('target', 'dummyframe')
      .setStyles({ 'float': 'left', 'padding-left': '3px', 'display':'block'});
      
    (new Hash(this.options.uploadAuthData)).each(function(v, k){
        f.adopt((new Element('input')).set({type:'hidden', name: k, value: v}));
    });
    
    f.adopt((new Element('input')).set({type:'file', 'name':'Filedata'}).setStyles({width:120}));                
    f.inject(this.menu, 'top');
    
    var uploadButton = this.addMenuButton('upload').addEvents({
        click:  function(e) { 
          e.stop();
          mfm.browserLoader.set('opacity', 1);
          f.action = mfm.options.url 
                     + 'event=upload' 
                     + '&directory='+encodeURIComponent(mfm.Directory) 
                     + ((this.label && this.label.getElement('.checkbox').hasClass('checkboxChecked')) ? '&resize=1' : 'resize=0');
                     
          f.submit();
        },
        mouseenter: function(){
          this.addClass('hover');
        },
        mouseleave: function(){
          this.removeClass('hover');
          this.blur();
        },
        mousedown: function(){
          this.focus();
        }
      });
    
      this.menu.adopt(uploadButton);
      
    if (this.options.resizeImages){
      var resizer = new Element('div', {'class': 'checkbox'}),
        check = (function(){ this.toggleClass('checkboxChecked'); }).bind(resizer);
      check();
      uploadButton.label = new Element('label').adopt(
        resizer, new Element('span', {text: this.language.resizeImages})
      ).addEvent('click', check).inject(this.menu);
    }
    
    
    this._dummyframe = (new IFrame).set({src: 'about:blank', name: 'dummyframe'}).setStyles({display:'none'});
    this.menu.adopt(this._dummyframe);
    
    this._dummyframe.addEvent('load', function(){ 
        mfm.browserLoader.set('opacity', 0); 
        
        try
        {
          var response = JSON.decode(this.contentDocument.documentElement.innerText);
          if (response && !response.status)
          {
            new Dialog(('' + response.error).substitute(self.language, /\\?\$\{([^{}]+)\}/g) , {language: {confirm: mfm.language.ok}, buttons: ['confirm']});
          }
          
          mfm.load(mfm.Directory,true, response.name ? response.name : null);
        }
        catch(e)
        {
          // Maybe this.contentDocument.documentElement.innerText isn't where we need to look?      
          
        }
    });
  }

});