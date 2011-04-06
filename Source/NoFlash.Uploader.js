/*
 * ---
 *
 * description: Implements Upload functionality into the FileManager without using Flash
 *              While the flash uploader is preferable, sometimes it is not possible to use it due to
 *              server restrictions (eg, mod_security), or perhaps users refuse to use flash.
 *
 *              This Upload handler will allow the MFM to continue to function, without multiple-upload-at-once
 *              function and without progress bars.  But otherwise, it should work.
 *
 * authors: James Sleeman (@sleemanj)
 *
 * license: MIT-style license.
 *
 * requires: [Core/*]
 *
 * provides: Filemanager.Uploader
 *
 * ...
 */

FileManager.implement({

	options: {
		resizeImages: true,
		upload: true,

		// Is there a useful reason to have this different from propagateData... dubious :-/
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

				try {
					if (this.upload.uploader) {
						this.upload.uploader.set('opacity', 0).dispose();
					}
				}
				catch(e) { }
			}
		}
	},

	onDialogOpenWhenUpload: function(){

	},

	onDialogCloseWhenUpload: function(){

	},

  startUpload: function(){
    var self = this;

    if (!this.options.upload || typeof this._dummyframe != 'undefined') return;

		var mfm = this;
		var f = (new Element('form'))
			.set('action', this.options.url + 'event=upload')
			.set('method', 'post')
			.set('enctype', 'multipart/form-data')
			.set('target', 'dummyframe')
			.setStyles({ 'float': 'left', 'padding-left': '3px', 'display':'block'});

		Object.each(this.options.uploadAuthData, function(v, k){
			f.adopt((new Element('input')).set({type:'hidden', name: k, value: v}));
		});

    // Writing to file input values is not permitted, we replace the field to blank it.
    function make_file_input()
    {
      var fileinput = (new Element('input')).set({type:'file', 'name':'Filedata'}).setStyles({width:120});
      if(f.getElement('input[type=file]'))
      {
        fileinput.replaces(f.getElement('input[type=file]'));
      }
      else
      {
        f.adopt(fileinput);
      }
    }

    make_file_input();

		// The FileManager.php can't make up it's mind about which it wants, directory is documented as GET,
		// but is checked as POST, we'll send both.
		f.adopt((new Element('input')).set({type:'hidden', 'name':'directory'}));

		f.inject(this.menu, 'top');

		var uploadButton = this.addMenuButton('upload').addEvents({
			click:  function(e) {
				e.stop();
				mfm.browserLoader.set('opacity', 1);
				f.action = mfm.options.url
					+ (mfm.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({}, {
						event: 'upload',
						directory: self.normalize(mfm.Directory),
						filter: mfm.options.filter,
						resize: (this.label && this.label.getElement('.checkbox').hasClass('checkboxChecked')) ? 1 : 0,
            reportContentType: 'text/plain' // Safer for iframes
					  }));
          f.getElement('input[name=directory]').value = mfm.Directory;
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
        check = (function(){
					this.toggleClass('checkboxChecked');
				}).bind(resizer);

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
				var response;
				try
				{
					response = this.contentDocument.documentElement.textContent;
				}
				catch(e) {}

				if (!response)
				{
					try
					{
						response = this.contentWindow.document.innerText;
					}
					catch(e) {}
				}

				if (!response)
				{
					try
					{
						response = this.contentDocument.innerText;
					}
					catch(e) {}
				}

				if (!response)
					throw "Can't find response.";

				response = JSON.decode(response);

				if (response && !response.status)
				{
					new FileManager.Dialog(('' + response.error).substitute(self.language, /\\?\$\{([^{}]+)\}/g) , {language: {confirm: mfm.language.ok}, buttons: ['confirm']});
				}
          else
				{
					mfm.onShow = true; // why exactly do we need to set this, what purpose does the default of NOT preselecting the thing we asked to preselect have?

					mfm.load(mfm.Directory.replace(/\/$/, ''), response.name ? response.name : null);
				}
			}
			catch(e)
			{
				// Maybe this.contentDocument.documentElement.innerText isn't where we need to look?
				// debugger; console.log(this);
				mfm.load(mfm.Directory);
			}

        make_file_input();
		});
	}
});
