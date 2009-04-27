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
			text: this.language.browse
		}).inject(this.menu, 'top');
		
		/* Fix this */
		var alertStatus = function(message, cls){
			new Element('div', {
				'class': cls,
				html: message,
				events: {
					click: function(){
						this.destroy();
					}
				}
			}).inject(this.button, 'after');
		}
		
		var File = new Class({

			Extends: Swiff.Uploader.File,

			initialize: function(uploader, data){
				this.parent(uploader, data);
			},

			render: function(){
				if (this.invalid) {
					var message = 'Unknown Error', sub = {
						name: this.name,
						size: Swiff.Uploader.formatUnit(this.size, 'b')
					};
					
					switch (this.validationError) {
						case 'duplicate':
							message = 'You can not attach "<em>{name}</em>" ({size}), it is already added!';
							sub.size_max = Swiff.Uploader.formatUnit(this.base.options.fileSizeMax, 'b');
							break;
						case 'sizeLimitMin':
							message = 'You can not attach "<em>{name}</em>" ({size}), the file size minimum is <strong>{size_min}</strong>!';
							sub.size_min = Swiff.Uploader.formatUnit(this.base.options.fileSizeMin, 'b');
							break;
						case 'sizeLimitMax':
							message = 'You can not attach "<em>{name}</em>" ({size}), the file size limit is <strong>{size_max}</strong>!';
							sub.size_max = Swiff.Uploader.formatUnit(this.base.options.fileSizeMax, 'b');
							break;
					}

					alertStatus(message.substitute(sub), 'error');
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
				this.ui.element = new Element('li', {'class': 'file', id: 'file-' + this.id});
				this.ui.title = new Element('span', {'class': 'file-title', text: this.name});
				this.ui.size = new Element('span', {'class': 'file-size', text: Swiff.Uploader.formatUnit(this.size, 'b')});
				
				this.ui.cancel = new Element('a', {'class': 'file-cancel', text: 'Cancel', href: '#'});
				this.ui.cancel.addEvent('click', function() {
					this.remove();
					return false;
				}.bind(this));
				
				var progress = new Element('img', {'class': 'file-progress', src: self.options.assetBasePath+'bar.gif'});

				this.ui.element.adopt(
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

			onOpen: function() {
				this.ui.element.addClass('file-running');
			},

			onRemove: function() {
				this.ui = this.ui.element.destroy();
			},

			onProgress: function() {
				this.ui.progress.start(this.progress.percentLoaded);
			},

			onStop: function() {
				this.remove();
			},

			onComplete: function() {
				this.ui.progress = this.ui.progress.cancel().element.destroy();
				this.ui.cancel = this.ui.cancel.destroy();
				
				new Element('input', {type: 'checkbox', 'checked': true}).inject(this.ui.element, 'top');
				this.ui.element.highlight('#e6efc2');
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
			onFileRemove: function(){}
		});
		
		if(!swf){
			// TODO Test this
			this.preview.adopt(new Element('span', {html: this.language.flash}));
			return;
		}
		
		this.button.addEvents({
			click: function() {
				return false;
			},
			mouseenter: function() {
				this.addClass('hover');
				swf.reposition();
			},
			mouseleave: function() {
				this.removeClass('hover');
				this.blur();
			},
			mousedown: function() {
				this.focus();
			}
		});
		
		this.preview.adopt(container);
	}
	
});

/*
	var filter = {};
	if(options.filter) filter[Lang.img] = '*.jpg; *.jpeg; *.gif; *.png';
	
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