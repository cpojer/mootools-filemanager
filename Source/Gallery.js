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
		this.imgContainerSize = { x: 75, y: 56 };
		this.captionImgContainerSize = { x: 250, y: 250 };

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
				if (!self.keepGalleryData) {
					self.gallery.empty();
					self.metadata = [];
					self.files = [];
				}
				else {
					self.keepGalleryData = false;
				}
				self.hideClone();
				self.wrapper.setStyle('display', 'none');
			},

			modify: function(file, json, mode, self) {
				// mode is one of (destroy, rename, move, copy): only when mode=copy, does the file remain where it was before!
				if (mode !== 'copy')
				{
					var name = self.normalize(file.dir + '/' + file.name);
					self.erasePicture(name);
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
		var self = this;

		this.input = new Element('input', {name: 'imgCaption'}).addEvent('keyup', function(e){
			if (e.key == 'enter') {
				self.removeClone(e, this);
			}
		});
		var imgdiv = new Element('div', {'class': 'img'});
		this.wrapper = new Element('div', {
			'class': 'filemanager-wrapper',
			styles:
			{
				'z-index': this.options.zIndex + 750
			},
			tween: {duration: 'short'},
			opacity: 0,
			events: {
				mouseenter: function(){
					clearTimeout(timer);
				},
				mouseleave: function(e){
					var target = this;
					timer = (function(){
						self.removeClone(e, target);
					}).delay(500);
				}
			}
		}).adopt(
			new Element('span', {text: this.language.gallery.text}),
			this.input,
			imgdiv,
			new Element('button', {text: this.language.gallery.save}).addEvent('click', function(e) {
				self.removeClone(e, this);
			})
		).inject(document.body);

		var wrapper_pos = this.wrapper.getCoordinates();
		var imgdiv_pos = imgdiv.getCoordinates();
		this.captionDialogOffsets = {
			x: Math.round(wrapper_pos.left - imgdiv_pos.left - (imgdiv_pos.width - this.captionImgContainerSize.x) / 2),
			y: Math.round(wrapper_pos.top - imgdiv_pos.top - (imgdiv_pos.height - this.captionImgContainerSize.y) / 2),
			h: wrapper_pos.height,
			w: wrapper_pos.width
		};

		this.droppables.push(this.gallery);

		this.keepGalleryData = false;
		this.metadata = [];
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

	show_caption_editor: function(img_el, li_wrapper, file)
	{
		var name = this.normalize(file.dir + '/' + file.name);

		var pos = img_el.getCoordinates();
		var oml = img_el.getStyle('margin-left').toInt();
		var omt = img_el.getStyle('margin-top').toInt();
		pos.left -= oml;
		pos.top -= omt;

		var vp = window.getSize();

		this.hideClone();

		var pic = file.thumb250;
		var w = file.thumb250_width;
		var h = file.thumb250_height;

		if (!pic)
		{
			pic = file.icon48;
			w = 48;
			h = 48;
		}

		// now calculate the scaled image dimensions for this one:
		var cw = this.captionImgContainerSize.x;
		var ch = this.captionImgContainerSize.y;
		if (w > cw)
		{
			var redux = cw / w;
			w *= redux;
			h *= redux;
		}
		if (h > ch)
		{
			var redux = ch / h;
			w *= redux;
			h *= redux;
		}
		w = Math.round(w);
		h = Math.round(h);
		var ml, mk, mt, mb;
		ml = Math.round((cw - w) / 2);
		mr = cw - ml - w;
		mt = Math.round((ch - h) / 2);
		mb = ch - mt - h;

		var nl, nt;
		//nl = Math.round(pos.left - (w - pos.width) / 2);
		//nt = pos.top - (h - pos.height);
		nl = Math.round((vp.x - this.captionDialogOffsets.w) / 2 - this.captionDialogOffsets.x);
		nt = Math.round((vp.y - this.captionDialogOffsets.h) / 2 - this.captionDialogOffsets.y);

		this.animation = {
			from: {
				width: pos.width,
				height: pos.height,
				left: pos.left,
				top: pos.top,
				'margin-left': oml,
				'margin-top': omt
			},
			to: {
				width: w,
				height: h,
				left: nl,
				top: nt,
				'margin-left': ml,
				'margin-top': mt
			}
		};

		var self = this;
		this.input.removeEvents('blur').addEvent('blur', function(){
			var index = self.files.indexOf(name);
			if (index < 0)
				return;
			self.metadata[index].caption = (this.get('value') || '');
		});

		//li_wrapper.set('opacity', 0);
		this.clone = img_el.clone();
		this.clone.store('file', file).store('parent', li_wrapper).addClass('filemanager-clone').setStyles(this.animation.from).set({
			morph: {link: 'chain'},
			styles: {
				position: 'absolute',
				'z-index': this.options.zIndex + 800
			},
			events: {
				click: function(e){
					var index = self.files.indexOf(name);
					if (index < 0)
						return;
					self.fireEvent('galleryPreview', [file.path, self.metadata[index], li_wrapper, self]);
				}
			}
		}).inject(document.body).morph(this.animation.to).get('morph').chain(function(){
			var index = self.files.indexOf(name);
			if (index < 0)
				return;
			self.input.set('value', self.metadata[index].caption || '');
			self.wrapper.setStyles({
				opacity: 1,
				display: 'block',
				left: self.animation.to.left + self.captionDialogOffsets.x /* -12 */,
				top: self.animation.to.top + self.captionDialogOffsets.y /* -53 */
			}).fade(1).get('tween').chain(function(){
				self.input.focus();
			});
		});
	},

	img_injector: function(file, imgcontainer, li_wrapper)
	{
		var pic = file.thumb250;
		var w = file.thumb250_width;
		var h = file.thumb250_height;

		if (!pic)
		{
			pic = file.icon48;
			w = 48;
			h = 48;
		}

		// now calculate the scaled image dimensions for this one:
		var cw = this.imgContainerSize.x;
		var ch = this.imgContainerSize.y;
		if (w > cw)
		{
			var redux = cw / w;
			w *= redux;
			h *= redux;
		}
		if (h > ch)
		{
			var redux = ch / h;
			w *= redux;
			h *= redux;
		}
		w = Math.round(w);
		h = Math.round(h);
		var ml, mk, mt, mb;
		ml = Math.round((cw - w) / 2);
		mr = cw - ml - w;
		mt = Math.round((ch - h) / 2);
		mb = ch - mt - h;

		var self = this;
		var img = new Asset.image(pic, {
			styles: {
				width: w,
				height: h,
				'margin-top': mt,
				'margin-bottom': mb,
				'margin-left': ml,
				'margin-right': mr
			},
			onLoad: function(){
				var img_el = this;
				li_wrapper.setStyle('background', 'none').addEvent('click', function(e){
					if (e) e.stop();

					self.show_caption_editor(img_el, li_wrapper, file);
				});
			},
			onError: function() {
				self.diag.log('image asset: error!');
				var iconpath = self.assetBasePath + 'Images/Icons/Large/default-error.png';
				this.src = iconpath;
			},
			onAbort: function() {
				self.diag.log('image asset: ABORT!');
				var iconpath = self.assetBasePath + 'Images/Icons/Large/default-error.png';
				this.src = iconpath;
			}
		});

		img.inject(imgcontainer);
	},

	onDragComplete: function(el, droppable, caption) {

		if (typeof caption === 'undefined') {
			caption = '';
		}

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
				mime: 'unknown/unknown',
				thumbs_deferred: true
			};
		}
		else
		{
			el.setStyles({left: '', top: ''});
			file = el.retrieve('file');
		}

		var name = this.normalize(file.dir + '/' + file.name);

		// when the item already exists in the gallery, do not add it again:
		if (this.files.contains(name))
			return true;

		// store & display item in gallery:
		var index = this.files.push(name)  - 1;

		var self = this;
		var destroyIcon = new Asset.image(this.assetBasePath + 'Images/destroy.png').set({
			'class': 'filemanager-remove',
			title: this.language.gallery.remove,
			events: {
				click: function(e) {
					if (e) e.stop();

					self.erasePicture(name);
				}
			}
		});

		//var imgpath = this.normalize('/' + this.root + file.dir + '/' + file.name);

		/*
		 * as 'imgcontainer.getSize() won't deliver the dimensions as set in the CSS, we turn it the other way around:
		 * we set the w/h of the image container here explicitly; the CSS can be used for other bits of styling.
		 */
		var imgcontainer = new Element('span', {
			'class': 'gallery-image',
			styles: {
				width: this.imgContainerSize.x,
				height: this.imgContainerSize.y
			}
		});
		var li = new Element('li').store('file', file).adopt(
			destroyIcon,
			imgcontainer
		).inject(this.gallery);

		this.metadata[index] = {
			caption: caption,
			file: file,
			element: li
		};

		this.showFunctions(destroyIcon,li,1);
		this.tips.attach(destroyIcon);
		this.switchButton();

		// When the file info is lacking thumbnail info, fetch it by firing a 'detail' request and taking it from there.
		// Also send our flavour of the 'detail' request when the thumbnail is yet to be generated.
		if (file.thumbs_deferred)
		{
			// request full file info for this one! PLUS direct-access thumbnails!

			// do NOT set this.Request as this is a parallel request; mutiple ones may be fired when onDragComplete is, for instance, invoked from the array-loop inside populate()

			var req = new FileManager.Request({
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
					var index = this.files.indexOf(name);
					if (index < 0)
						return;

					if (!j || !j.status) {
						var msg = ('' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g);

						this.metadata[index].caption = msg;
						return;
					}

					// the desired behaviour anywhere is NOT identical to that when handling the FileManager 'details' request/event!
					this.fireEvent('galleryDetails', [j, this]);

					// We also want to hold onto the data so we can access it later on,
					// e.g. when returning the gallery collection to the user.

					// now mix with the previously existing 'file' info:
					file = Object.merge(file, j);

					// remove unwanted JSON elements:
					delete file.thumbs_deferred;
					delete file.status;
					delete file.error;
					delete file.content;

					if (file.element)
					{
						file.element.store('file', file);
					}

					// and update the gallery pane:
					li.store('file', file);

					//this.onDragComplete(li, droppable);
					this.metadata[index].file = file;

					this.img_injector(file, imgcontainer, li);

				}).bind(this),
				onError: (function(text, error) {
				}).bind(this),
				onFailure: (function(xmlHttpRequest) {
				}).bind(this)
			}, this);

			this.RequestQueue.addRequest(String.uniqueID(), req);
			req.send();

			// while the 'details' request is sent off, keep a 'loader' animation in the spot where the thumbnail/image should end up once we've got that info from the 'details' request
		}
		else
		{
			// we already have all required information. Go show the image in the gallery pane!
			this.img_injector(file, imgcontainer, li);
		}

		return true;
	},

	removeClone: function(e, target){
		if (e) e.stop();

		if (!this.clone || (e.relatedTarget && ([this.clone, this.wrapper].contains(e.relatedTarget) || (this.wrapper.contains(e.relatedTarget) && e.relatedTarget != this.wrapper))))
			return;
		if (this.clone.get('morph').timer)
			return;

		var file = this.clone.retrieve('file');
		if (!file)
			return;

		var name = this.normalize(file.dir + '/' + file.name);
		var index = this.files.indexOf(name);
		if (index < 0)
			return;

		this.metadata[index].caption = (this.input.get('value') || '');

		this.clone.morph(this.animation.from).get('morph').clearChain().chain((function(){
			//this.clone.retrieve('parent').set('opacity', 1);
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
		if (parent) {
			//parent.set('opacity', 1);
		}
		this.clone.destroy();
		this.wrapper.setStyles({
			opacity: 0,
			display: 'none'
		});
	},

	erasePicture: function(name) {
		var index = this.files.indexOf(name);
		if (index >= 0)
		{
			var meta = this.metadata[index];

			this.metadata.splice(index, 1);
			this.files.splice(index, 1);

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
		this.diag.log('GALLERY.populate: ' + debug.dump(data));
		Object.each(data || {}, function(v, i){
			this.diag.log('GALLERY.populate: index = ' + i + ', value = ' + v);
			this.onDragComplete(i, this.gallery, v);
		}, this);
	},

	serialize_on_click: function(e){
		if (e) e.stop();

		var serialized = {};
		this.files.each(function(v, i){
			serialized[v] = (this.metadata[i].caption || '');
		}, this);
		this.keepGalleryData = true;
		this.hide(e);
		this.fireEvent('complete', [serialized, this.metadata, this]);
	}
});

})();

