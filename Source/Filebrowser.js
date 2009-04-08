/* 

TODO: Proper headers
TODO: Images (!) + Fix ImageBasePath to always have an / at the end

Based on a Script by Yannick Croissant

*/


var FileBrowser = new Class({

	Implements: [Options, Events],

	Request: null,
	Directory: null,
	Current: null,

	options: {
		/*onComplete: $empty,
		onModify: $empty,
		onShow: $empty,
		onOpen: $empty,
		onHide: $empty,*/
		directory: '',
		filter: null,
		url: null,
		imageBasePath: null,
		autoDisable: true
	},

	initialize: function(options){
		this.setOptions(options);

		this.droppables = [];
		this.Directory = this.options.directory;

		this.container = new Element('div', {'class': 'filebrowser-container'}).inject(document.body);
		this.el = new Element('div', {'class': 'filebrowser'}).inject(this.container);
		this.browser = new Element('ul', {'class': 'filebrowser-browser'}).addEvent('click', (function(e){
			if(e.target.match('ul')) this.deselect();
		}).bind(this)).inject(this.el);

		['open', 'create', 'upload'].each(function(v){
			new Element('button', {
				'class': 'filebrowser-'+v,
				text: Lang[v]
			}).addEvent('click', this[v].bind(this)).inject(this.el);
		}, this);

		if(this.options.filter=='image')
			new Element('span', {'class': 'notice', html: Lang.onlyimg}).inject(this.el);

		this.info = new Element('div', {'class': 'filebrowser-infos', opacity: 0}).inject(this.el);

		var head = new Element('div', {'class': 'filebrowser-head'}).adopt([
			new Element('img', {'class': 'filebrowser-icon'}),
			new Element('h1'),
			new Element('span', {'class': 'filebrowser-date', text: Lang.modified+' '})
		]);

		this.info.adopt([
			head,
			new Element('h2', {text: Lang.information})
		]);

		var list = new Element('dl').adopt([
			new Element('dt', {text: Lang.type}),
			new Element('dd', {'class': 'filebrowser-type'}),
			new Element('dt', {text: Lang.size}),
			new Element('dd', {'class': 'filebrowser-size'}),
			new Element('dt', {text: Lang.dir}),
			new Element('dd', {'class': 'filebrowser-dir'})
		]).inject(this.info);

		this.preview = new Element('div', {'class': 'filebrowser-preview'});
		this.info.adopt([
			new Element('h2', {'class': 'filebrowser-headline', text: Lang.preview}),
			this.preview
		]);

		new Element('a', {
			'class': 'filebrowser-close',
			href: '#',
			text: Lang.close
		}).addEvent('click', this.hide.bind(this)).inject(this.el);

		this.imageadd = new Asset.image(this.options.imageBasePath+'add.png', {
			'class': 'browser-add'
		}).set('opacity', 0).inject(this.container);

		this.overlay = new Overlay();

		this.keydown = (function(e){
			if(e.control) this.imageadd.fade(1);
		}).bind(this);

		this.keyup = (function(e){
			this.imageadd.fade(0);
		}).bind(this);

		this.scroll = (function(){
			this.el.center(this.offsets);
			this.fireEvent('scroll');
		}).bind(this);
	},

	show: function(e, upload){
		if(e) e.stop();

		if(upload) this.showUpload = true;
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
			this.fireEvent('open');

			this.container.set('opacity', 1);

			window.addEvents({
				scroll: this.scroll,
				resize: this.scroll
			});
		}).delay(500, this);
	},

	hide: function(e){
		if(e) e.stop();

		this.overlay.hide();
		this.browser.empty();
		this.container.setStyle('display', 'none');

		this.fireEvent('hide');
		window.removeEvent('scroll', this.scroll).removeEvent('resize', this.scroll);
	},

	open: function(e){
		e.stop();

		if(!this.Current) return false;
		
		this.fireEvent('complete', [
			this.normalize(this.Directory+'/'+this.Current.retrieve('file').name),
			this.Current.retrieve('file')
		]);
		this.hide();
	},

	create: function(e){
		e.stop();

		var self = this;
		new Popup(Lang.create, Lang.createdir, {
			language: {
				confirm: Lang.create1,
				decline: Lang.cancel
			},
			content: [
				new Element('input', {'class': 'createDirectory'})
			],
			onConfirm: function(){
				new Request.JSON({
					url: self.options.url+'?event=create',
					onRequest: self.loading.pass(self.browser),
					onSuccess: self.fill.bind(self),
					data: {
						filter: this.options.filter,
						file: this.el.getElement('input').get('value'),
						dir: self.Directory
					}
				}).post();
			}
		});
	},

	upload: function(e){
		if(e) e.stop();

		var fallback = new Element('span', {'class': 'leftm topm', html: Lang.flash}),
			self = this;

		this.showUpload = false;
		this.fillInfo();
		this.info.getElement('h2.filebrowser-headline').setStyle('display', 'none');
		this.preview.empty().adopt([
			new Element('h2', {text: Lang.upload}),
			fallback,
			FancyUpload2.Start({
				filter: this.options.filter,
				url: this.options.url+'?event=upload&n='+this.normalize(this.Directory)+'?name='+User.name+'&session='+User.session+'&id='+User.id,
				onAllComplete: function(){
					self.load(self.Directory, true);
					(function(){
						this.removeFile();
					}).delay(5000, this);
				},
				onLoad: function(){
					fallback.destroy();
				}
			})
		]);
	},

	deselect: function(el){
		if(el && this.Current!=el) return;

		if(el) this.fillInfo();
		if(this.Current) this.Current.removeClass('selected');
		this.Current = null;

		this.switchButton();
	},

	load: function(dir, nofade){
		this.deselect();
		if(!nofade) this.info.fade(0);

		if(this.Request) this.Request.cancel();

		this.Request = new Request.JSON({
			url: this.options.url,
			onRequest: this.loading.pass(this.browser),
			onSuccess: (function(j){
				this.fill(j, nofade);
				if(this.showUpload) this.upload();
			}).bind(this),
			data: {
				filter: this.options.filter,
				dir: dir
			}
		}).post();
	},

	destroy: function(e, file){
		e.stop();

		new Popup(Lang.destroy, Lang.destroyfile, {
			onConfirm: (function(){
				var self = this;
				new Request.JSON({
					url: this.options.url+'?event=destroy',
					data: {
						file: file.name,
						dir: this.Directory
					}
				}).post();

				this.fireEvent('modify', [$unlink(file)]);

				file.element.getParent().fade(0).get('tween').chain(function(){
					self.deselect(file.element);
					this.element.destroy();
				});
			}).bind(this)
		});

	},

	rename: function(e, file){
		e.stop();

		var name = file.name.split('.');
		if(file.mime!='text/directory') name.pop();

		var self = this;
		new Popup(Lang.rename, Lang.renamefile, {
			language: {
				confirm: Lang.rename,
				decline: Lang.cancel
			},
			content: [
				new Element('input', {'class': 'rename', value: name.join('')})
			],
			onConfirm: function(){
				new Request.JSON({
					url: self.options.url+'?event=move',
					onSuccess: (function(j){
						if(j && j.name){
							self.fireEvent('modify', [$unlink(file)]);

							file.element.getElement('span').set('text', j.name);
							file.name = j.name;
							self.fillInfo(file);
						}
					}).bind(this),
					data: {
						file: file.name,
						name: this.el.getElement('input').get('value'),
						dir: self.Directory
					}
				}).post();
			}
		});
	},

	loading: function(el){
		el.empty().addClass('filebrowser-loading');
	},

	fill: function(j, nofade){
		this.Directory = j.path;
		this.CurrentDir = j.dir;
		if(!nofade) this.fillInfo(j.dir);
		this.browser.removeClass('filebrowser-loading');

		if(!j.files) return;

		var els = [[], []];
		$each(j.files, function(file){
			file.dir = j.path;
			var el = file.element = new Element('span', {'class': 'fi', href: '#'}).adopt(
				new Asset.image(this.options.imageBasePath+'Icons/'+file.icon+'.png'),
				new Element('span', {text: file.name})
			).store('file', file).inject(
				new Element('li').inject(this.browser)
			);

			if(file.mime!='text/directory')
				new Asset.image(this.options.imageBasePath+'disk.png', {title: Lang.download}).addClass('browser-icon').addEvent('click', (function(e){
					e.stop();

					window.open(this.normalize(this.Directory+'/'+file.name));
				}).bind(this)).injectTop(el);

			if(file.name!='..')
				['rename', 'destroy'].each(function(v){
					new Asset.image(this.options.imageBasePath+v+'.png', {title: Lang[v]}).addClass('browser-icon').addEvent('click', this[v].bindWithEvent(this, [file])).injectTop(el);
				}, this);

			els[file.mime=='text/directory' ? 1 : 0].push(el);

			if(file.name=='..') el.set('opacity', 0.7);

			el.addEvent('click', (function(e){
				e.stop();
				if(el.retrieve('block')){
					el.eliminate('block');
					return;
				}else if(file.mime=='text/directory'){
					this.load(this.Directory+'/'+file.name);
					return;
				}

				this.fillInfo(file);
				if(this.Current) this.Current.removeClass('selected');

				this.Current = el.addClass('selected');
				
				this.switchButton();
			}).bind(this));
		}, this);


		var self = this;
		$$(els[0]).makeDraggable({
			droppables: $$(this.droppables, els[1]),

			onDrag: function(el, e){
				self.imageadd.setStyles(Hash.getValues(e.page).map(function(v){ return v+15; }).associate(['left', 'top']));
			},

			onBeforeStart: function(el){
				el.setStyles({left: '0', top: '0'});
			},
			
			onStart: function(el){
				self.onDragStart(el, this);

				el.set('opacity', 0.7);
				document.addEvents({
					keydown: self.keydown,
					keyup: self.keyup
				});
			},

			onEnter: function(el, droppable){
				droppable.morph('div.filebrowser ul li span.droppable');
			},

			onLeave: function(el, droppable){
				droppable.morph('div.filebrowser ul li span.dir');
			},

			onDrop: function(el, droppable, e){
				document.removeEvents('keydown', self.keydown).removeEvents('keyup', self.keydown);

				self.imageadd.fade(0);
				el.set('opacity', 1).store('block', true);
				if(e.control || !droppable)
					el.setStyles({left: '0', top: '0'});

				if(!droppable)
					return;

				droppable.morph('ul.filebrowser-browser span.selected').get('morph').chain(function(){
					droppable.morph('div.filebrowser ul li span.dir');
				});

				if(self.onDragComplete(el, droppable))
					return;

				var dir = droppable.retrieve('file'),
					file = el.retrieve('file');

				new Request.JSON({
					url: self.options.url+'?event=move',
					data: {
						file: file.name,
						dir: self.Directory,
						ndir: dir.dir+'/'+dir.name,
						copy: e.control ? 1 : 0
					}
				}).post();

				self.fireEvent('modify', [$unlink(file)]);

				if(!e.control)
					el.fade(0).get('tween').chain(function(){
						self.deselect(el);
						el.getParent().destroy();
					});
			}
		});
	$$(els).setStyles({left: '0', top: '0'});
		var tips = new Tips(this.browser.getElements('img.browser-icon'));

		tips.tip.removeClass('tip-base');
	},

	fillInfo: function(file, path){
		if(!file) file = this.CurrentDir;
		if(!path) path = this.Directory;

		if(!file) return;
		var size = this.size(file.size);

		this.info.fade(1).getElement('img').set({
			src: this.options.imageBasePath+'Icons/'+file.icon+'.png',
			alt: file.mime
		});

		this.preview.empty();

		this.info.getElement('h1').set('text', file.name);
		this.info.getElement('span.filebrowser-date').set('text', Lang.modified+' '+file.date);
		this.info.getElement('dd.filebrowser-type').set('text', file.mime);
		this.info.getElement('dd.filebrowser-size').set('text', !size[0] && size[1]=='Bytes' ? '-' : (size.join(' ')+(size[1]=='Bytes' ? ' ('+file.size+' Bytes)' : '')));
		this.info.getElement('h2.filebrowser-headline').setStyle('display', file.mime=='text/directory' ? 'none' : 'block');

		var text = [], pre = [];

		path.split('/').each(function(v){
			if(!v) return;

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

		this.info.getElement('dd.filebrowser-dir').empty().adopt(text);

		if(file.mime=='text/directory') return;

		if(this.Request) this.Request.cancel();

		this.Request = new Request.JSON({
			url: this.options.url+'?event=list',
			onRequest: this.loading.pass(this.preview),
			onSuccess: (function(j){
				var prev = this.preview.removeClass('filebrowser-loading').set('html', j && j.content ? j.content : '').getElement('img.prev');
				if(prev) prev.addEvent('load', function(){
						this.setStyle('background', 'none');
					});

				var els = this.preview.getElements('button');
				if(els) els.addEvent('click', function(e){
					e.stop();

					window.open(this.get('value'));
				});
			}).bind(this),
			data: {
				dir: this.Directory,
				file: file.name
			}
		}).post();
	},

	size: function(size){
		var tab = ['Bytes' ,'KB' ,'MB' ,'GB' ,'TB' ,'PB'];
		for(var i = 0;size>1024;i++)
			size = size/1024;

		return [Math.round(size), tab[i]];
	},

	normalize: function(str){
		return str.replace(/\/+/g, '/');
	},

	switchButton: function(){
		var chk = !!this.Current;

		this.el.getElement('button.filebrowser-open').set('disabled', !chk)[(chk ? 'remove' : 'add')+'Class']('disabled');
	},

	onDragStart: $empty,
	onDragComplete: $lambda(false)

});