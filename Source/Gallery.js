var FileGallery = new Class({
	
	Extends: FileBrowser,
	
	options: {
		onShow: function(){
			this.galleryContainer.setStyles({
				opacity: 0,
				display: 'block'
			});
			
			var size = this.el.getSize(),
				pos = this.el.getPosition();
			
			this.galleryContainer.setStyles({
				top: pos.y+(size.y-this.galleryContainer.getHeight())/2,
				left: pos.x+size.x-1,
				opacity: 1
			});
			
			$$('img.filebrowser-clone').destroy();
			
			this.wrapper.setStyle('display', 'none');
		},
		
		onOpen: function(){
			this.populate();
		},
		
		onHide: function(){
			this.galleryUl.getChildren().destroy();
			
			this.subtext = {};
			this.files = [];
			
			$$('img.filebrowser-clone').destroy();
			
			this.wrapper.setStyle('display', 'none');
		}
	},
	
	initialize: function(el, options){
		this.input = $(el);
		
		this.offsets = {x: -90};
		
		this.addEvent('modify', this.externalModification.bind(this));
		this.addEvent('scroll', this.options.onShow);
		this.parent(options);
		
		new Element('button', {
			'class': 'filebrowser-open',
			text: Lang['bgallery']
		}).addEvent('click', this.serialize.bind(this)).replaces(this.el.getElement('button.filebrowser-open'));
		
		this.galleryContainer = new Element('div', {'class': 'filebrowser-gallery'}).inject(this.container);
		
		this.galleryUl = new Element('ul').inject(this.galleryContainer);
		
		var removeClone = this.removeClone.bindWithEvent(this),
			img = new Asset.image('BrowserIcons/Icons/destroy.png').set({
					'class': 'filebrowser-delete',
					title: Lang['gallery.premove']
				}).addEvent('click', this.erasePicture.bindWithEvent(this)),
			tips = new Tips(img, {offsets: {x: -100}});
		
		tips.tip.removeClass('tip-base');
		
		this.wrapperinput = new Element('input', {name: 'img_subtext'});
		this.wrapper = new Element('div', {
			'class': 'filebrowser-wrapper',
			tween: {duration: 200},
			opacity: 0
		}).addEvent('mouseleave', removeClone).adopt(
			img,
			new Element('div', {'class': 'img'}),
			new Element('span', {'class': 'b', text: Lang.subtext}),
			this.wrapperinput,
			new Element('button', {'class': 'small', text: Lang['global.save']}).addEvent('click', removeClone)
		).inject(document.body);
		
		this.droppables.push(this.galleryUl);
		
		this.subtext = {};
		this.files = [];
		
		this.Animation = {};
		
		this.switchButton();
	},
	
	populate: function(){
		Hash.each(JSON.decode(this.input.get('value')) || {}, function(v, i){
			this.subtext[i] = v;
			
			this.onDragComplete(i, this.galleryUl);
		}, this);
	},
	
	onDragStart: function(el, drag){
		this.browser.setStyle('overflow', 'visible');
	},
	
	onDragComplete: function(el, droppable){
		this.browser.setStyles({
			overflow: 'auto',
			overflowX: 'hidden'
		});
		
		if(!droppable || droppable!=this.galleryUl)
			return false;
		
		if($type(el)=='string'){
			var split = el.split('/'),
				file = {
					name: split.pop(),
					dir: split.join('/')
				}
		}else{
			el.setStyles({left: '', top: ''});
			var file = el.retrieve('file');
		}
		
		var	img = this.normalize('thumb.php/'+file.dir+'/'+file.name),
			self = this,
			name = this.normalize(file.dir+'/'+file.name);
		
		if(this.files.contains(name)) return true;
		
		this.files.push(name);
		
		new Element('li').store('identifier', name).adopt(
			new Asset.image(img, {
				onload: function(){
					var el = this,
						li = this.getParent();
					alert('hi');
					li.setStyle('background', 'none').addEvent('click', function(e){
						if(e) e.stop();
						alert('hi');
						if(self.blockClone) return;
						
						var pos = el.getCoordinates(),
							docwidth = document.getWidth();
						
						self.Animation = {
							From: {
								width: 70,
								height: 52,
								left: pos.left,
								top: pos.top
							},
							
							To: {
								width: 200,
								height: 150,
								left: pos.left-65,
								top: pos.top-49
							}
						};
						
						if(self.Animation.To.left+200>docwidth)
							self.Animation.To.left -= self.Animation.To.left+220-docwidth;
						
						$$('img.filebrowser-clone').destroy();
						
						self.wrapperinput.removeEvents('blur').addEvent('blur', function(){
							self.subtext[name] = this.get('value') || '';
						});
						
						self.clone = el.clone().store('file', file).store('parent', li).addClass('filebrowser-clone').set({
							morph: {link: 'chain'},
							styles: {
								position: 'absolute',
								zIndex: 1100
							}
						}).setStyles(pos).addEvents({
							mouseleave: self.removeClone.bindWithEvent(self),
							click: function(){
								Slimbox.open(name, self.subtext[name] || '', {
									onClose: function(){
										li.fireEvent('click');
									}	
								});
							}
						}).inject(document.body).morph(self.Animation.To);
						
						self.wrapper.get('tween').pause();
						self.clone.get('morph').chain(function(){
							self.wrapperinput.set('value', self.subtext[name] || '');
							
							self.wrapper.setStyles({
								opacity: 0,
								display: 'block',
								left: self.Animation.To.left-10,
								top: self.Animation.To.top-12
							}).fade(1);
						});
					});
				}
			})
		).inject(this.galleryUl);
		
		this.switchButton();
		
		return true;
	},
	
	removeClone: function(e, fn){
		if(!this.clone || (e.relatedTarget && (e.relatedTarget==this.clone || e.relatedTarget==this.wrapper || e.relatedTarget.getParent('div:uid('+$uid(this.wrapper)+')')))) return;
		
		if(this.clone.get('morph').timer) return;
		
		var file = this.clone.retrieve('file');
		this.subtext[this.normalize(file.dir+'/'+file.name)] = this.wrapperinput.get('value') || '';
		
		this.blockClone = true;
		this.clone.morph(this.Animation.From).get('morph').clearChain().chain((function(){
			if(fn) fn();
			this.clone.destroy();
			this.blockClone = false;
		}).bind(this));
		
		this.wrapper.fade(0).get('tween').chain(function(){
			this.element.setStyle('display', 'none');
		});
	},
	
	erasePicture: function(e){
		var file = this.clone.retrieve('file'),
			name = this.normalize(file.dir+'/'+file.name);
		
		delete this.subtext[name];
		this.files.erase(name);
		
		this.clone.get('morph').pause();
		
		e.relatedTarget = null;
		this.removeClone(e, (function(){
			var self = this;
			this.clone.retrieve('parent').removeEvents('click').fade(0).get('tween').chain(function(){
				this.element.destroy();
				
				self.switchButton();
			});
		}).bind(this));
	},
	
	externalModification: function(file){
		var name = this.normalize(file.dir+'/'+file.name),
			self = this;
		
		var el = this.galleryUl.getElement('li:identifier('+name+')');
		
		if(!el) return;
		
		delete this.subtext[name];
		this.files.erase(name);
		
		el.removeEvents('click').fade(0).get('tween').chain(function(){
			this.element.destroy();
			
			self.switchButton();
		});
	},
	
	switchButton: function(){
		var chk = !!this.galleryUl.getChildren().length;
		
		this.el.getElement('button.filebrowser-open').set('disabled', !chk)[(chk ? 'remove' : 'add')+'Class']('disabled');
	},
	
	serialize: function(e){
		e.stop();
		
		var serialized = {};
		this.files.each(function(v){
			serialized[v] = this.subtext[v] || '';
		}, this);
		
		this.hide();
		
		this.fireEvent('complete', [serialized]);
	}
	
});