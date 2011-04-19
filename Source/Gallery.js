/*
---

description: Adds functionality to create a gallery out of a list of images

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/*]

provides: FileManager.Gallery

...
*/

(function(){

FileManager.Gallery = new Class({

	Extends: FileManager,

	initialize: function(options)
	{
		this.offsets = {y: -72};

		// make sure our 'complete' event does NOT clash with the base class event by simply never allowing it: you CANNOT have options.selectable and gallery mode at the same time!
		// (If you do, the caller will have a hard time detecting /who/ sent the 'complete' event; the only way would be to inspect the argument list and deduce the 'origin' from there.)
		options.selectable = false;

		this.parent(options);

		this.addEvents({
			scroll: function(e, self) {
				self.show_gallery();
			},

			show: function(self) {
				self.show_gallery();
				self.populate();
			},

			hide: function(self) {
				if (!this.keepData) {
					this.gallery.empty();
					this.metadata = {};
					this.files = [];
				}
				else {
					this.keepData = false;
				}
				this.hideClone();
				this.wrapper.setStyle('display', 'none');
			},

			modify: function(file, json, mode, self) {
				// mode is one of (destroy, rename, move, copy): only when mode=copy, does the file remain where it was before!
				if (mode !== 'copy')
				{
					var name = this.normalize(file.dir + '/' + file.name);
					this.erasePicture(name);
				}
			}
		});

		this.addMenuButton('serialize');
		this.galleryContainer = new Element('div', {
			'class': 'filemanager-gallery',
			styles:
			{
				'z-index': this.options.zIndex + 10
			}
		}).inject(this.container);
		this.gallery = new Element('ul').inject(this.galleryContainer);

		var timer;
		var removeClone = this.removeClone.bind(this);

		this.input = new Element('input', {name: 'imgCaption'}).addEvent('keyup', function(e){
			if (e.key == 'enter') {
				removeClone(e);
			}
		});
		this.wrapper = new Element('div', {
			'class': 'filemanager-wrapper',
			styles:
			{
				'z-index': this.options.zIndex + 20
			},
			tween: {duration: 'short'},
			opacity: 0,
			events: {
				mouseenter: function(){
					clearTimeout(timer);
				},
				mouseleave: function(e){
					timer = (function(){
						removeClone(e);
					}).delay(500);
				}
			}
		}).adopt(
			new Element('span', {text: this.language.gallery.text}),
			this.input,
			new Element('div', {'class': 'img'}),
			new Element('button', {text: this.language.gallery.save}).addEvent('click', removeClone)
		).inject(document.body);

		this.droppables.push(this.gallery);

		this.keepData = false;
		this.metadata = {};
		this.files = [];
		this.animation = {};

		this.howto = new Element('div', {
			'class': 'howto',
			styles:
			{
				'z-index': this.options.zIndex + 15
			},
			text: this.language.gallery.drag
		}).inject(this.galleryContainer);
		this.switchButton();

		// invoke the parent method directly
		this.initialShowBase();
	},

	// override the parent's initialShow method: we do not want to jump to the jsGET-stored position again!
	initialShow: function() {
	},

	show_gallery: function()
	{
		this.galleryContainer.setStyles({
			opacity: 0,
			display: 'block'
		});

		this.filemanager.setStyles({
			top: '10%',
			height: '60%'
		});
		this.fitSizes();

		var size = this.filemanager.getSize();
		var pos = this.filemanager.getPosition();
		this.galleryContainer.setStyles({
			top: pos.y + size.y - 1,
			left: pos.x + (size.x - this.galleryContainer.getWidth()) / 2,
			opacity: 1
		});

		this.hideClone();
		this.wrapper.setStyle('display', 'none');
	},

	// override the parent's allow_DnD method: always allow drag and drop as otherwise we cannot construct our gallery!
	allow_DnD: function(j, pagesize) {
		return true;
	},

	onDragComplete: function(el, droppable) {

		this.imageadd.fade(0);

		if (this.howto){
			this.howto.destroy();
			this.howto = null;
		}

		if (!droppable || droppable != this.gallery)
			return false;

		var file;
		if (typeof el === 'string')
		{
			var part = el.split('/');
			file = {
				name: part.pop(),
				dir: part.join('/'),
				mime: 'unknown/unknown'
			};
		}
		else
		{
			el.setStyles({left: '', top: ''});
			file = el.retrieve('file');
		}

		var self = this;
		var name = this.normalize(file.dir + '/' + file.name);

		// when the item already exists in the gallery, do not add it again:
		if (this.files.contains(name))
			return true;

		// store & display item in gallery:
		var index = this.files.push(name)  - 1;

		var destroyIcon = new Asset.image(this.assetBasePath + 'Images/destroy.png').set({
			'class': 'filemanager-remove',
			title: this.language.gallery.remove,
			events: {
				click: this.removePicture
			}
		}).store('gallery', this);

		var imgpath = this.normalize('/' + this.root + file.dir + '/' + file.name);
		var imgcontainer = new Element('span', {'class': 'gallery-image'});
		var li = new Element('li').store('file', file).adopt(
			destroyIcon,
			imgcontainer
		).inject(this.gallery);

		this.metadata[name] = {
			caption: '',
			file: file,
			element: li
		};

		this.showFunctions(destroyIcon,li,1);
		this.tips.attach(destroyIcon);
		this.switchButton();

		var img_injector = function(file, imgcontainer, self)
		{
			var img = new Asset.image(file.thumb250, {
				onLoad: function(){
					var el = this;
					li.setStyle('background', 'none').addEvent('click', function(e){
						if (e) e.stop();

						var pos = el.getCoordinates();
						pos.left += el.getStyle('paddingLeft').toInt();
						pos.top += el.getStyle('paddingTop').toInt();

						self.hideClone();
						self.animation = {
							from: {
								width: 75,
								height: 56,
								left: pos.left,
								top: pos.top
							},
							to: {
								width: 200,
								height: 150,
								left: pos.left - 75,
								top: pos.top + pos.height - 150
							}
						};

						self.hideClone();
						self.input.removeEvents('blur').addEvent('blur', function(){
							self.metadata[name].caption = (this.get('value') || '');
						});

						li.set('opacity', 0);
						self.clone = el.clone();
						self.clone.store('file', file).store('parent', li).addClass('filemanager-clone').setStyles(self.animation.from).set({
							morph: {link: 'chain'},
							styles: {
								position: 'absolute',
								zIndex: self.dragZIndex - 200
							},
							events: {
								click: function(e){
									self.fireEvent('galleryPreview', [file.path, self.metadata[name], li, self]);
								}
							}
						}).inject(document.body).morph(self.animation.to).get('morph').chain(function(){
							self.input.set('value', self.metadata[name].caption || '');
							self.wrapper.setStyles({
								opacity: 0,
								display: 'block',
								left: self.animation.to.left - 12,
								top: self.animation.to.top - 53
							}).fade(1).get('tween').chain(function(){
								self.input.focus();
							});
						});
					});
				},
				onError: function() {
					if (typeof console !== 'undefined' && console.log) console.log('image asset: error!');
					var iconpath = self.assetBasePath + 'Images/Icons/Large/default-error.png';
					img.src = iconpath;
				},
				onAbort: function() {
					if (typeof console !== 'undefined' && console.log) console.log('image asset: ABORT!');
					var iconpath = self.assetBasePath + 'Images/Icons/Large/default-error.png';
					img.src = iconpath;
				}
			});

			img.inject(imgcontainer);
		};

		// When the file info is lacking thumbnail info, fetch it by firing a 'detail' request and taking it from there.
		// Also send our flavour of the 'detail' request when the thumbnail is yet to be generated.
		if (file.thumb250_width == null)
		{
			// request full file info for this one! PLUS direct-access thumbnails!

			// do NOT set this.Request as this is a parallel request; mutiple ones may be fired when onDragComplete is, for instance, invoked from the array-loop inside populate()

			new FileManager.Request({
				url: this.options.url + (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({},  {
					event: 'detail'
				})),
				data: {
					directory: file.dir,
					// fixup for *directory* detail requests
					file: (file.mime == 'text/directory' ? '.' : file.name),
					filter: this.options.filter,
					mode: 'direct'                          // provide direct links to the thumbnail files
				},
				onRequest: function() {},
				onSuccess: (function(j)
				{
					if (!j || !j.status) {
						var msg = ('' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g);

						this.metadata[name].caption = msg;
						return;
					}

					// the desired behaviour anywhere is NOT identical to that when handling the FileManager 'details' request/event!
					this.fireEvent('galleryDetails', [j, this]);

					// We also want to hold onto the data so we can access it later on,
					// e.g. when returning the gallery collection to the user.

					// now mix with the previously existing 'file' info:
					file = Object.merge(file, j);
					// remove unwanted JSON elements:
					delete file.status;
					delete file.error;
					delete file.content;

					if (file.element) {
						file.element.store('file', file);
					}

					// and update the gallery pane:
					li.store('file', file);

					//this.onDragComplete(li, droppable);
					this.metadata[name].file = file;

					img_injector(file, imgcontainer, self);

				}).bind(this),
				onError: (function(text, error) {
				}).bind(this),
				onFailure: (function(xmlHttpRequest) {
				}).bind(this)
			}, this).send();

			// while the 'details' request is sent off, keep a 'loader' animation in the spot where the thumbnail/image should end up once we've got that info from the 'details' request
		}
		else
		{
			// we already have all required information. Go show the image in the gallery pane!
			img_injector(file, imgcontainer, self);
		}

		return true;
	},

	removeClone: function(e){
		if (e) e.stop();

		if (!this.clone || (e.relatedTarget && ([this.clone, this.wrapper].contains(e.relatedTarget) || (this.wrapper.contains(e.relatedTarget) && e.relatedTarget != this.wrapper))))
			return;
		if (this.clone.get('morph').timer)
			return;

		var file = this.clone.retrieve('file');
		if (!file)
			return;

		var name = this.normalize(file.dir + '/' + file.name);
		this.metadata[name].caption = (this.input.get('value') || '');

		this.clone.morph(this.animation.from).get('morph').clearChain().chain((function(){
			this.clone.retrieve('parent').set('opacity', 1);
			this.clone.destroy();
		}).bind(this));

		this.wrapper.fade(0).get('tween').chain(function(){
			this.element.setStyle('display', 'none');
		});
	},

	hideClone: function(){
		if (!this.clone)
			return;

		this.clone.get('morph').cancel();
		var parent = this.clone.retrieve('parent');
		if (parent) parent.set('opacity', 1);
		this.clone.destroy();
		this.wrapper.setStyles({
			opacity: 0,
			display: 'none'
		});
	},

	removePicture: function(e){
		if (e) e.stop();

		var self = this.retrieve('gallery'),
			parent = this.getParent('li'),
			file = parent.retrieve('file'),
			name = self.normalize(file.dir + '/' + file.name);

		self.erasePicture(name);
	},

	erasePicture: function(name) {
		var index = this.files.indexOf(name);
		if (index >= 0)
		{
			var meta = this.metadata[index];

			this.metadata = this.metadata.splice(index, 1);
			this.files = this.files.splice(index, 1);

			this.tips.hide();

			var self = this;
			meta.element.set('tween', {duration: 'short'}).removeEvents('click').fade(0).get('tween').chain(function(){
				this.element.destroy();
				self.switchButton();
			});
		}
	},

	switchButton: function(){
		if (typeof this.gallery != 'undefined') {
			var chk = !!this.gallery.getChildren().length;
			this.menu.getElement('button.filemanager-serialize').set('disabled', !chk)[(chk ? 'remove' : 'add') + 'Class']('disabled');
		}
	},

	populate: function(data)
	{
		if (typeof console !== 'undefined' && console.log) console.log('GALLERY.populate: ' + debug.dump(data));
		Object.each(data || {}, function(v, i){
			if (typeof console !== 'undefined' && console.log) console.log('GALLERY.populate: index = ' + i + ', value = ' + v);
			this.onDragComplete(i, this.gallery);
			this.metadata[i].caption = v;
		}, this);
	},

	serialize_on_click: function(e){
		if (e) e.stop();
		var serialized = {};
		this.files.each(function(v){
			serialized[v] = (this.metadata[v].caption || '');
		}, this);
		this.keepData = true;
		this.hide(e);
		this.fireEvent('complete', [serialized, this.metadata, this]);
	}
});

})();

