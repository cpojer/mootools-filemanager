/*
---
description: FileManager

authors:
  - Christoph Pojer

requires:
  core/1.2.4: '*'
  more/1.2.4.2: [Drag, Drag.Move, Tips, Assets, Element.Delegation]

provides:
  - filemanager

license:
  MIT-style license

version:
  1.0

todo:
  - Add Scroller.js (optional) for Drag&Drop in the Filelist

inspiration:
  - Loosely based on a Script by [Yannick Croissant](http://dev.k1der.net/dev/brooser-un-browser-de-fichier-pour-mootools/)

options:
  - url: (string) The base url to the Backend FileManager, without QueryString
  - baseURL: (string) Absolute URL to the FileManager files
  - assetBasePath: (string) The path to all images and swf files
  - selectable: (boolean, defaults to *false*) If true, provides a button to select a file
  - language: (string, defaults to *en*) The language used for the FileManager
  - hideOnClick: (boolean, defaults to *false*) When true, hides the FileManager when the area outside of it is clicked
  - directory: (string) Can be used to load a subfolder instead of the base folder

events:
  - onComplete(path, file): fired when a file gets selected via the "Select file" button
  - onModify(file): fired when a file gets renamed/deleted or modified in another way
  - onShow: fired when the FileManager opens
  - onHide: event fired when FileManager closes
  - onPreview: event fired when the user clicks an image in the preview
...
*/

var FileManager = new Class({

	Implements: [Options, Events],

	Request: null,
	Directory: null,
	Current: null,

	options: {
		/*onComplete: $empty,
		onModify: $empty,
		onShow: $empty,
		onHide: $empty,
		onPreview: $empty*/
		directory: '',
		url: null,
		baseURL: '',
		assetBasePath: null,
		selectable: false,
		hideOnClick: false,
		language: 'en'
	},
	
	hooks: {
		show: {},
		cleanup: {}
	},

	initialize: function(options){
		this.setOptions(options);
		this.options.assetBasePath = this.options.assetBasePath.replace(/(\/|\\)*$/, '/');
		this.dragZIndex = 1300;
		this.droppables = [];
		this.Directory = this.options.directory;

		this.language = $unlink(FileManager.Language.en);
		if (this.options.language != 'en') this.language = $merge(this.language, FileManager.Language[this.options.language]);
		
		this.container = new Element('div', {'class': 'filemanager-container filemanager-engine-' + Browser.Engine.name + (Browser.Engine.trident ? Browser.Engine.version : '')});
		this.el = new Element('div', {'class': 'filemanager'}).inject(this.container);
		this.menu = new Element('div', {'class': 'filemanager-menu'}).inject(this.el);
		this.loader = new Element('div', {'class': 'loader', opacity: 0, tween: {duration: 200}}).inject(this.menu);

		var self = this;
		this.relayClick = function(e){
			if(e) e.stop();
			var file = this.retrieve('file');
			if (this.retrieve('block') && !Browser.Engine.trident){
				this.eliminate('block');
				return;
			}

			if (file.mime == 'text/directory'){
				this.addClass('selected');
				self.load(self.Directory + '/' + file.name);
				return;
			}

			self.fillInfo(file);
			if (self.Current) self.Current.removeClass('selected');
			self.Current = this.addClass('selected');

			self.switchButton();
		};
		this.browser = new Element('ul', {'class': 'filemanager-browser'}).addEvents({
			click: (function(){
				return self.deselect();
			}),
			'click:relay(li span.fi)': this.relayClick
		}).inject(this.el);
		
		this.addMenuButton('create');
		if (this.options.selectable) this.addMenuButton('open');
		
		this.info = new Element('div', {'class': 'filemanager-infos', opacity: 0}).inject(this.el);

		var head = new Element('div', {'class': 'filemanager-head'}).adopt([
			new Element('img', {'class': 'filemanager-icon'}),
			new Element('h1')
		]);

		this.info.adopt([head, new Element('h2', {text: this.language.information})]);

		new Element('dl').adopt([
			new Element('dt', {text: this.language.modified}),
			new Element('dd', {'class': 'filemanager-modified'}),
			new Element('dt', {text: this.language.type}),
			new Element('dd', {'class': 'filemanager-type'}),
			new Element('dt', {text: this.language.size}),
			new Element('dd', {'class': 'filemanager-size'}),
			new Element('dt', {text: this.language.dir}),
			new Element('dd', {'class': 'filemanager-dir'})
		]).inject(this.info);
		
		this.preview = new Element('div', {'class': 'filemanager-preview'}).addEvent('click:relay(img.preview)', function(){
			self.fireEvent('preview', [this.get('src')]);
		});
		this.info.adopt([
			new Element('h2', {'class': 'filemanager-headline', text: this.language.preview}),
			this.preview
		]);
		
		this.closeIcon = new Element('div', {
			'class': 'filemanager-close',
			title: this.language.close,
			events: {click: this.hide.bind(this)}
		}).adopt(new Asset.image(this.options.assetBasePath + 'destroy.png')).inject(this.el);

		this.tips = new Tips({
			className: 'tip-filebrowser',
			offsets: {x: 15, y: 0},
			text: null,
			showDelay: 50,
			hideDelay: 50,
			onShow: function(){
				this.tip.set('tween', {duration: 250}).setStyle('display', 'block').fade(1);
			},
			onHide: function(){
				this.tip.fade(0).get('tween').chain(function(){
					this.element.setStyle('display', 'none');
				});
			}
		});
		this.tips.attach(this.closeIcon.appearOn(this.closeIcon, [1, 0.8]).appearOn(this.el, 0.8));
		
		this.imageadd = new Asset.image(this.options.assetBasePath + 'add.png', {
			'class': 'browser-add'
		}).set('opacity', 0).inject(this.container);
		
		this.container.inject(document.body);
		this.overlay = new Overlay(this.options.hideOnClick ? {
			events: {click: this.hide.bind(this)}
		} : null);
		
		this.bound = {
			keydown: (function(e){
				if (e.control || e.meta) this.imageadd.fade(1);
			}).bind(this),
			keyup: (function(){
				this.imageadd.fade(0);
			}).bind(this),
			keyesc: (function(e){
				if (e.key=='esc') this.hide();
			}).bind(this),
			scroll: (function(){
				this.el.center(this.offsets);
				this.fireEvent('scroll');
			}).bind(this)
		};
	},

	show: function(e){
		if (e) e.stop();

		this.load(this.Directory);
		this.overlay.show();

		this.info.set('opacity', 0);

		(function(){
			this.container.setStyles({
				opacity: 0,
				display: 'block'
			});

			this.el.center(this.offsets);
			this.fireEvent('show');
			this.container.set('opacity', 1);
			this.fireHooks('show');

			window.addEvents({
				scroll: this.bound.scroll,
				resize: this.bound.scroll,
				keyup: this.bound.keyesc
			});
		}).delay(500, this);
	},

	hide: function(e){
		if (e) e.stop();

		this.overlay.hide();
		this.tips.hide();
		this.browser.empty();
		this.container.setStyle('display', 'none');
		
		this.fireHooks('cleanup').fireEvent('hide');
		window.removeEvent('scroll', this.bound.scroll).removeEvent('resize', this.bound.scroll).removeEvent('keyup', this.bound.keyesc);
	},

	open: function(e){
		e.stop();

		if (!this.Current) return false;
		
		this.fireEvent('complete', [
			this.normalize(this.Directory + '/' + this.Current.retrieve('file').name),
			this.Current.retrieve('file')
		]);
		this.hide();
	},

	create: function(e){
		e.stop();

		var self = this;
		new Dialog(this.language.createdir, {
			language: {
				confirm: this.language.create,
				decline: this.language.cancel
			},
			content: [
				new Element('input', {'class': 'createDirectory'})
			],
			onOpen: this.onDialogOpen.bind(this),
			onClose: this.onDialogClose.bind(this),
			onShow: function(){
				var self = this;
				this.el.getElement('input').addEvent('keyup', function(e){
					if (e.key == 'enter') self.el.getElement('button-confirm').fireEvent('click');
				}).focus();
			},
			onConfirm: function(){
				new FileManager.Request({
					url: self.options.url + '?event=create',
					onSuccess: self.fill.bind(self),
					data: {
						file: this.el.getElement('input').get('value'),
						directory: self.Directory
					}
				}, self).post();
			}
		});
	},

	deselect: function(el){
		if (el && this.Current != el) return;

		if (el) this.fillInfo();
		if (this.Current) this.Current.removeClass('selected');
		this.Current = null;

		this.switchButton();
	},

	load: function(dir, nofade){
		this.deselect();
		if (!nofade) this.info.fade(0);

		if (this.Request) this.Request.cancel();

		this.Request = new FileManager.Request({
			url: this.options.url,
			onSuccess: (function(j){
				this.fill(j, nofade);
			}).bind(this),
			data: {
				directory: dir
			}
		}, this).post();
	},

	destroy: function(e, file){
		e.stop();
		this.tips.hide();
		
		var self = this;
		new Dialog(this.language.destroyfile, {
			language: {
				confirm: this.language.destroy,
				decline: this.language.cancel
			},
			onOpen: this.onDialogOpen.bind(this),
			onClose: this.onDialogClose.bind(this),
			onConfirm: function(){
				new FileManager.Request({
					url: self.options.url + '?event=destroy',
					data: {
						file: file.name,
						directory: self.Directory
					},
					onSuccess: function(j){
						if (!j || j.content!='destroyed'){
							new Dialog(self.language.nodestroy, {language: {confirm: self.language.ok}, buttons: ['confirm']});
							return;
						}

						self.fireEvent('modify', [$unlink(file)]);
						file.element.getParent().fade(0).get('tween').chain(function(){
							self.deselect(file.element);
							this.element.destroy();
						});
					}
				}, self).post();
			}
		});

	},

	rename: function(e, file){
		e.stop();
		this.tips.hide();
		
		var name = file.name;
		if (file.mime != 'text/directory') name = name.replace(/\..*$/, '');

		var self = this;
		new Dialog(this.language.renamefile, {
			language: {
				confirm: this.language.rename,
				decline: this.language.cancel
			},
			content: [
				new Element('input', {'class': 'rename', value: name})
			],
			onOpen: this.onDialogOpen.bind(this),
			onClose: this.onDialogClose.bind(this),
			onShow: function(){
				var self = this;
				this.el.getElement('input').addEvent('keyup', function(e){
					if (e.key=='enter') self.el.getElement('button-confirm').fireEvent('click');
				}).focus();
			},
			onConfirm: function(){
				new FileManager.Request({
					url: self.options.url + '?event=move',
					onSuccess: (function(j){
						if (!j || !j.name) return;

						self.fireEvent('modify', [$unlink(file)]);

						file.element.getElement('span').set('text', j.name);
						file.name = j.name;
						self.fillInfo(file);
					}).bind(this),
					data: {
						file: file.name,
						name: this.el.getElement('input').get('value'),
						directory: self.Directory
					}
				}, self).post();
			}
		});
	},

	fill: function(j, nofade){
		this.Directory = j.path;
		this.CurrentDir = j.dir;
		if (!nofade) this.fillInfo(j.dir);
		this.browser.empty();

		if (!j.files) return;

		var els = [[], []];
		$each(j.files, function(file){
			file.dir = j.path;
			var el = file.element = new Element('span', {'class': 'fi', href: '#'}).adopt(
				new Asset.image(this.options.assetBasePath + 'Icons/' + file.icon + '.png'),
				new Element('span', {text: file.name})
			).store('file', file);

			var icons = [];
			if (file.mime!='text/directory')
				icons.push(new Asset.image(this.options.assetBasePath + 'disk.png', {title: this.language.download}).addClass('browser-icon').addEvent('click', (function(e){
					this.tips.hide();
					e.stop();
					window.open(this.options.baseURL + this.normalize(this.Directory + '/' + file.name));
				}).bind(this)).inject(el, 'top'));

			if (file.name != '..')
				['rename', 'destroy'].each(function(v){
					icons.push(new Asset.image(this.options.assetBasePath + v + '.png', {title: this.language[v]}).addClass('browser-icon').addEvent('click', this[v].bindWithEvent(this, [file])).injectTop(el));
				}, this);

			els[file.mime == 'text/directory' ? 1 : 0].push(el);
			if (file.name == '..') el.set('opacity', 0.7);
			el.inject(new Element('li').inject(this.browser)).store('parent', el.getParent());
			icons = $$(icons.map(function(icon){ return icon.appearOn(icon, [1, 0.7]); })).appearOn(el.getParent('li'), 0.7);
		}, this);

		var self = this, revert = function(el){
			el.set('opacity', 1).store('block', true).removeClass('drag').removeClass('move').setStyles({
				opacity: 1,
				zIndex: '',
				position: 'relative',
				width: 'auto',
				left: 0,
				top: 0
			}).inject(el.retrieve('parent'));
			el.getElements('img.browser-icon').set('opacity', 0);
			
			document.removeEvents('keydown', self.bound.keydown).removeEvents('keyup', self.bound.keydown);
			self.imageadd.fade(0);

			self.relayClick.apply(el);
		};
		$$(els[0]).makeDraggable({
			droppables: $$(this.droppables, els[1]),

			onDrag: function(el, e){
				self.imageadd.setStyles({
					left: e.page.x + 15,
					top: e.page.y + 15
				});
			},

			onBeforeStart: function(el){
				self.deselect();
				self.tips.hide();
				var position = el.getPosition();
				el.addClass('drag').setStyles({
					zIndex: self.dragZIndex,
					position: 'absolute',
					width: el.getWidth() - el.getStyle('paddingLeft').toInt(),
					left: position.x,
					top: position.y
				}).inject(self.container);
			},

			onCancel: revert,

			onStart: function(el){
				el.set('opacity', 0.7).addClass('move');
				document.addEvents({
					keydown: self.bound.keydown,
					keyup: self.bound.keyup
				});
			},

			onEnter: function(el, droppable){
				droppable.addClass('droppable');
			},

			onLeave: function(el, droppable){
				droppable.removeClass('droppable');
			},

			onDrop: function(el, droppable, e){
				revert(el);

				if (e.control || e.meta || !droppable) el.setStyles({left: 0, top: 0});
				if (!droppable && !e.control && !e.meta) return;
				
				var dir;
				if (droppable){
					droppable.addClass('selected').removeClass('droppable');
					(function(){ droppable.removeClass('selected'); }).delay(300);
					if (self.onDragComplete(el, droppable)) return;

					dir = droppable.retrieve('file');
				}
				var file = el.retrieve('file');

				new FileManager.Request({
					url: self.options.url + '?event=move',
					data: {
						file: file.name,
						directory: self.Directory,
						newDirectory: dir ? dir.dir + '/' + dir.name : self.Directory,
						copy: e.control || e.meta ? 1 : 0
					},
					onSuccess: function(){
						if (!dir) self.load(self.Directory);
					}
				}, self).post();

				self.fireEvent('modify', [$unlink(file)]);

				if (!e.control && !e.meta)
					el.fade(0).get('tween').chain(function(){
						self.deselect(el);
						el.getParent().destroy();
					});
			}
		});

		$$(els).setStyles({left: 0, top: 0});

		this.tips.attach(this.browser.getElements('img.browser-icon'));
	},

	fillInfo: function(file, path){
		if (!file) file = this.CurrentDir;
		if (!path) path = this.Directory;

		if (!file) return;
		var size = this.size(file.size);

		this.info.fade(1).getElement('img').set({
			src: this.options.assetBasePath + 'Icons/' + file.icon + '.png',
			alt: file.mime
		});
		
		this.fireHooks('cleanup');
		this.preview.empty();

		this.info.getElement('h1').set('text', file.name);
		this.info.getElement('dd.filemanager-modified').set('text', file.date);
		this.info.getElement('dd.filemanager-type').set('text', file.mime);
		this.info.getElement('dd.filemanager-size').set('text', !size[0] && size[1] == 'Bytes' ? '-' : (size.join(' ') + (size[1] != 'Bytes' ? ' (' + file.size + ' Bytes)' : '')));
		this.info.getElement('h2.filemanager-headline').setStyle('display', file.mime == 'text/directory' ? 'none' : 'block');

		var text = [], pre = [];

		path.split('/').each(function(v){
			if (!v) return;

			pre.push(v);
			text.push(new Element('a', {
					'class': 'icon',
					href: '#',
					text: v
				}).addEvent('click', (function(e, dir){
					e.stop();

					this.load(dir);
				}).bindWithEvent(this, [pre.join('/')]))
			);
			text.push(new Element('span', {text: ' / '}));
		}, this);

		text.pop();
		text[text.length-1].addClass('selected').removeEvents('click').addEvent('click', function(e){ e.stop(); });

		this.info.getElement('dd.filemanager-dir').empty().adopt(new Element('span', {text: '/ '}), text);

		if (file.mime=='text/directory') return;

		if (this.Request) this.Request.cancel();

		this.Request = new FileManager.Request({
			url: this.options.url + '?event=detail',
			onSuccess: (function(j){
				var prev = this.preview.removeClass('filemanager-loading').set('html', j && j.content ? j.content.substitute(this.language, /\\?\$\{([^{}]+)\}/g) : '').getElement('img.prev');
				if (prev) prev.addEvent('load', function(){
					this.setStyle('background', 'none');
				});

				var els = this.preview.getElements('button');
				if (els) els.addEvent('click', function(e){
					e.stop();
					window.open(this.get('value'));
				});
			}).bind(this),
			data: {
				directory: this.Directory,
				file: file.name
			}
		}, this).post();
	},

	size: function(size){
		var tab = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		for(var i = 0; size > 1024; i++)
			size = size/1024;

		return [Math.round(size), tab[i]];
	},

	normalize: function(str){
		return str.replace(/\/+/g, '/');
	},

	switchButton: function(){
		var chk = !!this.Current;
		var el = this.menu.getElement('button.filemanager-open');
		if (el) el.set('disabled', !chk)[(chk ? 'remove' : 'add') + 'Class']('disabled');
	},

	addMenuButton: function(name){
		var el = new Element('button', {
			'class': 'filemanager-' + name,
			text: this.language[name]
		}).inject(this.menu, 'top');
		if (this[name]) el.addEvent('click', this[name].bind(this));
		return el;
	},
	
	fireHooks: function(hook){
		var args = Array.slice(arguments, 1);
		for(var key in this.hooks[hook]) this.hooks[hook][key].apply(this, args);
		return this;
	},
	
	onRequest: function(){ this.loader.set('opacity', 1); },
	onComplete: function(){ this.loader.fade(0); },
	onDialogOpen: $empty,
	onDialogClose: $empty,
	onDragComplete: $lambda(false)
	
});

FileManager.Request = new Class({
	
	Extends: Request.JSON,
	
	initialize: function(options, filebrowser){
		this.parent(options);
		
		if (filebrowser) this.addEvents({
			request: filebrowser.onRequest.bind(filebrowser),
			complete: filebrowser.onComplete.bind(filebrowser)
		});
	}
	
});

FileManager.Language = {};