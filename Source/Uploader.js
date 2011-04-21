/*
---

description: Implements Upload functionality into the FileManager based on [FancyUpload](http://digitarald.de)

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/*]

provides: Filemanager.Uploader

...
*/

FileManager.implement({

	options: {
		resizeImages: true,
		upload: true,
		uploadAuthData: {},            // deprecated; use FileManager.propagateData instead!
		uploadTimeLimit: 260,
		uploadFileSizeMax: 2600 * 2600 * 25
	},

	hooks: {
		show: {
			upload: function() {
				this.startUpload();
			}
		},

		cleanup: {
			upload: function(){
				if (!this.options.upload || !this.upload) return;

				if (this.upload.uploader) {
					this.upload.uploader.fade(0).get('tween').chain(function(){
						this.element.dispose();
					});
				}
			}
		}
	},

	lastFileUploaded: null,  // name of the last successfully uploaded file; will be preselected in the list view
	error_count: 0,


	onDialogOpenWhenUpload: function(){
		if (this.swf && this.swf.box) this.swf.box.setStyle('visibility', 'hidden');
	},

	onDialogCloseWhenUpload: function(){
		if (this.swf && this.swf.box) this.swf.box.setStyle('visibility', 'visible');
	},

	startUpload: function(){

		if (!this.options.upload || this.swf) return;

		var self = this;
		this.upload = {
			button: this.addMenuButton('upload').inject(this.menu, 'bottom').addEvents({
				click: function(){
					return false;
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
			}),
			list: new Element('ul', {'class': 'filemanager-uploader-list'}),
			uploader: new Element('div', {opacity: 0, 'class': 'filemanager-uploader-area'}).adopt(
				new Element('h2', {text: this.language.upload}),
				new Element('div', {'class': 'filemanager-uploader'})
			)
		};
		this.upload.uploader.getElement('div').adopt(this.upload.list);

		if (this.options.resizeImages){
			var resizer = new Element('div', {'class': 'checkbox'});
			var check = (function(){
					this.toggleClass('checkboxChecked');
				}).bind(resizer);
			check();
			this.upload.label = new Element('label').adopt(
				resizer,
				new Element('span', {text: this.language.resizeImages})
			).addEvent('click', check).inject(this.menu);
		}

		var File = new Class({

			Extends: Swiff.Uploader.File,

			initialize: function(base, data){

				this.parent(base, data);
				this.has_completed = false;

				self.diag.log('Uploader: setOptions');
				this.setOptions({
					//data: Object.merge({}, base.options.data, self.options.uploadAuthData),
					url: self.options.url + (self.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({}, (self.options.propagateType == 'GET' ? self.options.propagateData : {}), {
						event: 'upload',
						directory: self.Directory,
						filter: self.options.filter,
						resize: self.options.resizeImages && resizer.hasClass('checkboxChecked') ? 1 : 0
					}))
				});
			},

			render: function(){
				if (this.invalid){
					var message = self.language.uploader.unknown;
					var sub = {
						name: this.name,
						size: Swiff.Uploader.formatUnit(this.size, 'b')
					};

					if (self.language.uploader[this.validationError]) {
						message = self.language.uploader[this.validationError];
					}

					if (this.validationError === 'sizeLimitMin')
						sub.size_min = Swiff.Uploader.formatUnit(this.base.options.fileSizeMin, 'b');
					else if (this.validationError === 'sizeLimitMax')
						sub.size_max = Swiff.Uploader.formatUnit(this.base.options.fileSizeMax, 'b');

					self.showError(message.substitute(sub, /\\?\$\{([^{}]+)\}/g));
					return this;
				}

				this.addEvents({
					open: this.onOpen,
					remove: this.onRemove,
					requeue: this.onRequeue,
					progress: this.onProgress,
					stop: this.onStop,
					complete: this.onComplete
				});

				this.ui = {};
				this.ui.icon = new Asset.image(self.assetBasePath+'Images/Icons/' + this.extension + '.png', {
					'class': 'icon',
					onerror: function(){
						new Asset.image(self.assetBasePath + 'Images/Icons/default.png').replaces(this);
					}
				});
				this.ui.element = new Element('li', {'class': 'file', id: 'file-' + this.id});
				// keep filename in display box at reasonable length:
				var laname = this.name;
				if (laname.length > 36) {
					laname = laname.substr(0, 36) + '...';
				}
				this.ui.title = new Element('span', {'class': 'file-title', text: laname, title: this.name});
				this.ui.size = new Element('span', {'class': 'file-size', text: Swiff.Uploader.formatUnit(this.size, 'b')});

				var file = this;
				this.ui.cancel = new Asset.image(self.assetBasePath+'Images/cancel.png', {'class': 'file-cancel', title: self.language.cancel}).addEvent('click', function(){
					file.remove();
					self.tips.hide();
					self.tips.detach(this);
				});
				self.tips.attach(this.ui.cancel);

				var progress = new Element('img', {'class': 'file-progress', src: self.assetBasePath+'Images/bar.gif'});

				this.ui.element.adopt(
					this.ui.cancel,
					progress,
					this.ui.icon,
					this.ui.title,
					this.ui.size
				).inject(self.upload.list).highlight();

				this.ui.progress = new Fx.ProgressBar(progress).set(0);

				this.base.reposition();

				return this.parent();
			},

			onOpen: function(){
				this.ui.element.addClass('file-running');
			},

			onRemove: function(){
				this.ui = this.ui.element.destroy();

				// when all items in the list have been cancelled/removed, and the transmission of the files is done, i.e. after the onComplete has fired, destroy the list!
				var cnt = self.upload.list.getElements('li').length;
				if (cnt == 0 && this.has_completed)
				{
					self.upload.uploader.fade(0).get('tween').chain(function(){
						self.upload.uploader.setStyle('display', 'none');
					});
				}
			},

			onProgress: function(){
				this.ui.progress.start(this.progress.percentLoaded);
			},

			onStop: function(){
				this.remove();
			},

			onComplete: function(file_obj)
			{
				self.diag.log('File-onComplete', arguments, self.swf.fileList.length);

				var response = null;
				var failure = true;

				this.has_completed = true;

				this.ui.progress = this.ui.progress.cancel().element.destroy();
				this.ui.cancel = this.ui.cancel.destroy();

				try
				{
					response = JSON.decode(this.response.text);
				}
				catch(e)
				{
					self.diag.log(this.response);
				}

				if (typeof response === 'undefined' || response == null)
				{
					if (this.response == null || !this.response.text)
					{
						// The 'mod_security' has shown to be one of the most unhelpful error messages ever; particularly when it happened on a lot on boxes which had a guaranteed utter lack of mod_security and friends.
						// So we restrict this report to the highly improbable case where we get to receive /nothing/ /at/ /all/.
						self.showError(self.language.uploader.mod_security);
					}
					else
					{
						self.showError(("Server response:\n" + this.response.text).substitute(self.language, /\\?\$\{([^{}]+)\}/g));
					}
				}
				else if (!response.status)
				{
					self.showError(('' + response.error).substitute(self.language, /\\?\$\{([^{}]+)\}/g));
				}
				else
				{
					failure = false;
				}

				this.ui.element.set('tween', {duration: 2000}).highlight(!failure ? '#e6efc2' : '#f0c2c2');
				(function(){
					this.ui.element.setStyle('overflow', 'hidden').morph({
						opacity: 0,
						height: 0
					}).get('morph').chain(function(){
						this.element.destroy();
						var cnt = self.upload.list.getElements('li').length;
						if (cnt == 0)
						{
							self.upload.uploader.fade(0).get('tween').chain(function(){
								self.upload.uploader.setStyle('display', 'none');
							});
						}
					});
				}).delay(!failure ? 1000 : 5000, this);

				if (failure)
				{
					self.error_count++;
				}

				// don't wait for the cute delays to start updating the directory view!
				var cnt = self.upload.list.getElements('li').length;
				var fcnt = self.swf.fileList.length;
				self.diag.log('upload:onComplete for FILE', file_obj, cnt, fcnt);
				//self.onShow = true;
				//self.load(self.Directory, self.lastFileUploaded);
				//// self.fillInfo();
			}
		});

		this.getFileTypes = function() {
			var fileTypes = {};
			if (this.options.filter == 'image')
				fileTypes = {'Images (*.jpg, *.gif, *.png)': '*.jpg; *.jpeg; *.bmp; *.gif; *.png'};
			if (this.options.filter == 'video')
				fileTypes = {'Videos (*.avi, *.flv, *.mov, *.mpeg, *.mpg, *.wmv, *.mp4)': '*.avi; *.flv; *.fli; *.movie; *.mpe; *.qt; *.viv; *.mkv; *.vivo; *.mov; *.mpeg; *.mpg; *.wmv; *.mp4'};
			if (this.options.filter == 'audio')
				fileTypes = {'Audio (*.aif, *.mid, *.mp3, *.mpga, *.rm, *.wav)': '*.aif; *.aifc; *.aiff; *.aif; *.au; *.mka; *.kar; *.mid; *.midi; *.mp2; *.mp3; *.mpga; *.ra; *.ram; *.rm; *.rpm; *.snd; *.wav; *.tsi'};
			if (this.options.filter == 'text')
				fileTypes = {'Text (*.txt, *.rtf, *.rtx, *.html, *.htm, *.css, *.as, *.xml, *.tpl)': '*.txt; *.rtf; *.rtx; *.html; *.htm; *.css; *.as; *.xml; *.tpl'};
			if (this.options.filter == 'application')
				fileTypes = {'Application (*.bin, *.doc, *.exe, *.iso, *.js, *.odt, *.pdf, *.php, *.ppt, *.swf, *.rar, *.zip)': '*.ai; *.bin; *.ccad; *.class; *.cpt; *.dir; *.dms; *.drw; *.doc; *.dvi; *.dwg; *.eps; *.exe; *.gtar; *.gz; *.js; *.latex; *.lnk; *.lnk; *.oda; *.odt; *.ods; *.odp; *.odg; *.odc; *.odf; *.odb; *.odi; *.odm; *.ott; *.ots; *.otp; *.otg; *.pdf; *.php; *.pot; *.pps; *.ppt; *.ppz; *.pre; *.ps; *.rar; *.set; *.sh; *.skd; *.skm; *.smi; *.smil; *.spl; *.src; *.stl; *.swf; *.tar; *.tex; *.texi; *.texinfo; *.tsp; *.unv; *.vcd; *.vda; *.xlc; *.xll; *.xlm; *.xls; *.xlw; *.zip'};

			return fileTypes;
		};

		this.diag.log('Uploader: SWF init');
		this.lastFileUploaded = null;
		this.error_count = 0;
		this.swf = new Swiff.Uploader({
			id: 'SwiffFileManagerUpload',
			path: this.assetBasePath + 'Swiff.Uploader.swf',
			queued: false,
			target: this.upload.button,
			allowDuplicates: true,
			instantStart: true,
			appendCookieData: true, // pass along any session cookie data, etc. in the request section (PHP: $_GET[])
			verbose: this.options.verbose,
			data: Object.merge({},
				(self.options.propagateType == 'POST' ? self.options.propagateData : {}),
				(self.options.uploadAuthData || {})
			),
			fileClass: File,
			timeLimit: self.options.uploadTimeLimit,
			fileSizeMax: self.options.uploadFileSizeMax,
			typeFilter: this.getFileTypes(),
			zIndex: this.options.zIndex + 3000,
			onSelectSuccess: function(){
				self.diag.log('onSelectSuccess', arguments, self.swf.fileList.length);
				//self.fillInfo();
				self.show_our_info_sections(false);
				//self.info.getElement('h2.filemanager-headline').setStyle('display', 'none');
				self.info.adopt(self.upload.uploader.setStyle('display', 'block'));
				self.upload.uploader.fade(1);
			},
			onComplete: function(info){
				this.diag.log('onComplete', arguments, self.swf.fileList.length);

				// don't wait for the cute delays to start updating the directory view!
				var cnt = this.upload.list.getElements('li').length;
				var fcnt = this.swf.fileList.length;
				this.diag.log('upload:onComplete', info, cnt, fcnt);
				// add a 5 second delay when there were upload errors:
				(function() {
					this.onShow = true;
					this.load(this.Directory, this.lastFileUploaded);
					// this.fillInfo();
				}).bind(this).delay(this.error_count > 0 ? 5500 : 1);
			}.bind(this),
			onFileComplete: function(f){
				self.diag.log('onFileComplete', arguments, self.swf.fileList.length);
				self.lastFileUploaded = f.name;
			},
			onFail: function(error) {
				self.diag.log('onFail', arguments, self.swf.fileList.length);
				if (error !== 'empty') {
					$$(self.upload.button, self.upload.label).dispose();
					self.showError(self.language.flash[error] || self.language.flash.flash);
				}
			},

			onLoad: function(){
				self.diag.log('onLoad', arguments, self.swf.fileList.length);
			},
			onStart: function(){
				self.diag.log('onStart', arguments, self.swf.fileList.length);
			},
			onQueue: function(){
				self.diag.log('onQueue', arguments, self.swf.fileList.length);
			},
			onBrowse: function(){
				self.diag.log('onBrowse', arguments, self.swf.fileList.length);
			},
			onDisabledBrowse: function(){
				self.diag.log('onDisabledBrowse', arguments, self.swf.fileList.length);
			},
			onCancel: function(){
				self.diag.log('onCancel', arguments, self.swf.fileList.length);
			},
			onSelect: function(){
				self.diag.log('onSelect', arguments, self.swf.fileList.length);
			},
			onSelectFail: function(){
				self.diag.log('onSelectFail', arguments, self.swf.fileList.length);
			},

			onButtonEnter: function(){
				self.diag.log('onButtonEnter', arguments, self.swf.fileList.length);
			},
			onButtonLeave: function(){
				self.diag.log('onButtonLeave', arguments, self.swf.fileList.length);
			},
			onButtonDown: function(){
				self.diag.log('onButtonDown', arguments, self.swf.fileList.length);
			},
			onButtonDisable: function(){
				self.diag.log('onButtonDisable', arguments, self.swf.fileList.length);
			},

			onFileStart: function(){
				self.diag.log('onFileStart', arguments, self.swf.fileList.length);
			},
			onFileStop: function(){
				self.diag.log('onFileStop', arguments, self.swf.fileList.length);
			},
			onFileRequeue: function(){
				self.diag.log('onFileRequeue', arguments, self.swf.fileList.length);
			},
			onFileOpen: function(){
				self.diag.log('onFileOpen', arguments, self.swf.fileList.length);
			},
			onFileProgress: function(){
				self.diag.log('onFileProgress', arguments, self.swf.fileList.length);
			},
			onFileRemove: function(){
				self.diag.log('onFileRemove', arguments, self.swf.fileList.length);
			},

			onBeforeStart: function(){
				self.diag.log('onBeforeStart', arguments, self.swf.fileList.length);
			},
			onBeforeStop: function(){
				self.diag.log('onBeforeStop', arguments, self.swf.fileList.length);
			},
			onBeforeRemove: function(){
				self.diag.log('onBeforeRemove', arguments, self.swf.fileList.length);
			}
		});
	}
});

