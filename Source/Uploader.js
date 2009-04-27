/*
Script: Uploader.js
	MooTools FileManager - Implements Upload functionality into the FileManager based on [FancyUpload](http://digitarald.de)

License:
	MIT-style license.

Copyright:
	Copyright (c) 2009 [Christoph Pojer](http://og5.net/christoph).
*/

FileManager.implement({
	
	options: {
		upload: true,
		uploadAuthData: {}
	},
	
	hooks: {
		initialize: {
			upload: function(){
				if(this.options.upload) this.addMenuButton('upload');
			}
		},
		
		show: {
			upload: function(options){
				if(options.upload) this.showUpload = true;
			}
		},
		
		load: {
			upload: function(){
				if(this.showUpload) this.upload();
			}
		},
		cleanup: {
			upload: function(){
				if(this.button) this.button.destroy();
			}
		}
	},
	
	upload: function(e){
		if(e) e.stop();
		if(!this.options.upload) return;
		
		var self = this;
		
		this.showUpload = false;
		this.fillInfo();
		this.info.getElement('h2.filemanager-headline').setStyle('display', 'none');
		this.preview.empty().adopt([new Element('h2', {text: this.language.upload})]);
		
		var container = new Element('div', {'class': 'filemanager-uploader'});
		var list = new Element('ul', {'class': 'filemanager-uploader-list', opacity: 0}).inject(container);
		this.button = new Element('button', {
			'class': 'filemanager-browse',
			opacity: 0,
			text: this.language.browse
		}).inject(this.menu, 'top').fade(1);
		
		var File = new Class({

			Extends: Swiff.Uploader.File,

			render: function(){
				if(this.invalid){
					var message = self.language.uploader.unknown, sub = {
						name: this.name,
						size: Swiff.Uploader.formatUnit(this.size, 'b')
					};
					
					if(self.language.uploader[this.validationError])
						message = self.language.uploader[this.validationError];
					
					if(this.validationError=='duplicate')
						sub.size_max = Swiff.Uploader.formatUnit(this.base.options.fileSizeMax, 'b');
					else if(this.validationError=='sizeLimitMin')
							sub.size_min = Swiff.Uploader.formatUnit(this.base.options.fileSizeMin, 'b');
					else if(this.validationError=='sizeLimitMax')
							sub.size_max = Swiff.Uploader.formatUnit(this.base.options.fileSizeMax, 'b');
					
					new Dialog(new Element('div', {html: message.substitute(sub, /\\?\$\{([^{}]+)\}/g)}) , {language: {decline: self.language.ok}, buttons: ['decline']});
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
				
				this.ui.icon = new Asset.image(self.options.assetBasePath+'Icons/'+this.extension+'.png', {
					onerror: function(){ new Asset.image(self.options.assetBasePath+'Icons/default.png').replaces(this); }
				});
				this.ui.element = new Element('li', {'class': 'file', id: 'file-' + this.id});
				this.ui.title = new Element('span', {'class': 'file-title', text: this.name});
				this.ui.size = new Element('span', {'class': 'file-size', text: Swiff.Uploader.formatUnit(this.size, 'b')});
				
				this.ui.cancel = new Element('a', {'class': 'file-cancel', text: 'Cancel', href: '#'});
				this.ui.cancel.addEvent('click', function(){
					this.remove();
					return false;
				}.bind(this));
				
				var progress = new Element('img', {'class': 'file-progress', src: self.options.assetBasePath+'bar.gif'});

				this.ui.element.adopt(
					this.ui.icon,
					this.ui.title,
					this.ui.size,
					progress,
					this.ui.cancel
				).inject(list).highlight();
				
				this.ui.progress = new Fx.ProgressBar(progress, {
					fit: true
				}).set(0);
							
				this.base.reposition();

				return this.parent();
			},

			onOpen: function(){
				this.ui.element.addClass('file-running');
			},

			onRemove: function(){
				this.ui = this.ui.element.destroy();
			},

			onProgress: function(){
				this.ui.progress.start(this.progress.percentLoaded);
			},

			onStop: function(){
				this.remove();
			},

			onComplete: function(){
				this.ui.progress = this.ui.progress.cancel().element.destroy();
				this.ui.cancel = this.ui.cancel.destroy();
				
				var response = JSON.decode(this.response.text);
				if(!response.status)
					new Dialog((''+response.error).substitute(self.language, /\\?\$\{([^{}]+)\}/g) , {language: {decline: self.language.ok}, buttons: ['decline']});
			
				this.ui.element.set('tween', {duration: 2000}).highlight(response.status ? '#e6efc2' : '#f0c2c2');
				(function(){
					this.ui.element.setStyle('overflow', 'hidden').morph({
						opacity: 0,
						height: 0
					}).get('morph').chain(function(){
						this.element.destroy();
					});
				}).delay(5000, this);
			}

		});

		var swf = new Swiff.Uploader({
			path: this.options.assetBasePath+'Swiff.Uploader.swf',
			url: this.options.url+'?'+Hash.toQueryString($merge({}, this.options.uploadAuthData, {
				event: 'upload',
				directory: this.normalize(this.Directory)
			})),
			verbose: true,
			queued: false,
			target: this.button,
			instantStart: true,
			fileClass: File,
			fileSizeMax: 25 * 1024 * 1024,
			onBrowse: function(){},
			onCancel: function(){},
			onSelectSuccess: function(){
				list.fade(1);
			},
			onComplete: function(){
				self.load(self.Directory, true);
			}
		});
		
		if(!swf){
			this.preview.adopt(new Element('div', {'class': 'margin', html: this.language.flash}));
			return;
		}
		
		this.button.addEvents({
			click: function(){
				return false;
			},
			mouseenter: function(){
				this.addClass('hover');
				swf.reposition();
			},
			mouseleave: function(){
				this.removeClass('hover');
				this.blur();
			},
			mousedown: function(){
				this.focus();
			}
		});
		
		this.preview.adopt(container);
	}
	
});

/*
		new Element('label', {'class': 'uploadLabel'}).adopt(
			new Element('input', {'class': 'resizePictures', name: 'resizePictures1', type: 'checkbox', checked: 'checked'}).addClass('checkbox'),
			new Element('span', {text: Lang.resizePictures})
		),

		new Element('button', {text: Lang.startupload}).addEvent('click', function(e){
			e.stop();
			swiffy.upload({
				addUrl: '&resize='+(el.getElement('input.resizePictures').get('checked') ? 1 : 0)
			});
		}),
*/