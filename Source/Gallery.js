/*
 * ---
 *
 * description: Adds functionality to create a gallery out of a list of images
 *
 * authors: Christoph Pojer (@cpojer)
 *
 * license: MIT-style license.
 *
 * requires: [Core/*]
 *
 * provides: FileManager.Gallery
 *
 * ...
 */

(function(){

FileManager.Gallery = new Class({

	Extends: FileManager,

	initialize: function(options)
	{
		this.offsets = {y: -72};
		//this.galleryPlugin = true; // prevent that this.show() is called in the base class again
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
					this.captions = {};
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
					var name = this.normalize(file.path);
					var el = (this.gallery.getElements('li').filter(function(el){
						var f = el.retrieve('file');
						return name == this.normalize(f.path);
					}, this) || null)[0];

					if (el) {
						this.erasePicture(name, el);
					}
				}
			}
		});

		this.addMenuButton('serialize');
		this.galleryContainer = new Element('div', {'class': 'filemanager-gallery'}).inject(this.container);
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
			tween: {duration: 200},
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
		this.captions = {};
		this.files = [];
		this.animation = {};

		this.howto = new Element('div', {'class': 'howto', text: this.language.gallery.drag}).inject(this.galleryContainer);
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
		if (typeOf(el) == 'string')
		{
			var part = el.split('/');
			file = {
				name: part.pop(),
				dir: part.join('/')
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

		// When the file info is lacking thumbnail info, fetch it by firing a 'detail' request and taking it from there.
		// Also send our flavour of the 'detail' request when the thumbnail is yet to be generated.
		if (file.thumbnail250 == null || file.thumbnail250.indexOf('.php?') != -1)
		{
			// request full file info for this one!

			return true;
		}

		// store & display item in gallery:
		this.files.push(name);

		var destroyIcon = new Asset.image(this.assetBasePath + 'Images/destroy.png').set({
			'class': 'filemanager-remove',
			title: this.language.gallery.remove,
			events: {
				click: this.removePicture
			}
		}).store('gallery', this);

		var li = new Element('li').store('file', file).adopt(
			destroyIcon,
			new Asset.image(this.normalize('/' + this.root + file.dir + '/' + file.name), {
				onload: function(){
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
							self.captions[name] = (this.get('value') || '');
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
									self.fireEvent('galleryPreview', [file.path, self.captions[name], li, self]);
								}
							}
						}).inject(document.body).morph(self.animation.to).get('morph').chain(function(){
							self.input.set('value', self.captions[name] || '');
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
				}
			})
		).inject(this.gallery);
		this.showFunctions(destroyIcon,li,1);
		this.tips.attach(destroyIcon);
		this.switchButton();

		return true;
	},

	removeClone: function(e){
		if (!this.clone || (e.relatedTarget && ([this.clone, this.wrapper].contains(e.relatedTarget) || (this.wrapper.contains(e.relatedTarget) && e.relatedTarget != this.wrapper))))
			return;
		if (this.clone.get('morph').timer)
			return;

		var file = this.clone.retrieve('file');
		if (!file)
			return;

		this.captions[this.normalize(file.dir + '/' + file.name)] = (this.input.get('value') || '');

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

		self.erasePicture(name, parent);
	},

	erasePicture: function(name, element){
		this.captions[name] = '';
		this.files.erase(name);
		this.tips.hide();

		var self = this;
		element.set('tween', {duration: 250}).removeEvents('click').fade(0).get('tween').chain(function(){
			this.element.destroy();
			self.switchButton();
		});
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
			this.captions[i] = v;
			this.onDragComplete(i, this.gallery);
		}, this);
	},

	serialize_on_click: function(e){
		if (e) e.stop();
		var serialized = {};
		this.files.each(function(v){
			serialized[v] = (this.captions[v] || '');
		}, this);
		this.keepData = true;
		this.hide(e);
		this.fireEvent('galleryComplete', [serialized, this.files, this]);
	}
});

})();

