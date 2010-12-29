/*
 * @todo - test thunmb generation of small files
 * @todo - test in IE
 *
---
description: FileManager

Authors:
 - Christoph Pojer (http://cpojer.net)
    - author
 - James Ehly (http://www.devtrench.com) 
    - thumbnail list
 - Fabian Vogelsteller (http://frozeman.de) 
    - extended thumbnails
    - now absolute and relative paths are possible
    - add SqueezeBox for preview

requires:
  core/1.2.5: '*'
  more/1.2.5.1: [Drag, Drag.Move, Tips, Assets, Element.Delegation, Scroll, SmoothScroll]

provides:
  - filemanager

license:
  MIT-style license

version:
  1.1rc4

todo:
  - Add Scroller.js (optional) for Drag&Drop in the Filelist
  - port to mootools 1.3, ($unlink is Object.copy or Object.clone?)

inspiration:
  - Loosely based on a Script by [Yannick Croissant](http://dev.k1der.net/dev/brooser-un-browser-de-fichier-pour-mootools/)

options:
  - url: (string) The base url to the Backend FileManager (FileManager.php), without QueryString
  - assetBasePath: (string) The path to all images and swf files used by the filemanager
  - directory: (string, relative to the directory set in to the filemanager php class) Can be used to load a subfolder instead of the base folder
  - language: (string, defaults to *en*) The language used for the FileManager
  - hideOnClick: (boolean, defaults to *false*) When true, hides the FileManager when the area outside of it is clicked
  - selectable: (boolean, defaults to *false*) If true, provides a button to select a file
  - destroy: (boolean, defaults to *false*) Whether to allow deletion of files or not
	- rename: (boolean, defaults to *false*) Whether to allow renaming of files or not
	- createFolders: (boolean, defaults to *false*) Whether to allow creation of folders or not
  
  // set in uploader.js
  - upload: (boolean, defaults to *true*) 
  - uploadAuthData: (object) Data to be send with the GET-Request of an Upload as Flash ignores authenticated clients
  - resizeImages: (boolean, defaults to *true*) Whether to show the option to resize big images or not
  
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
		assetBasePath: null,		
		hideOnClick: false,
		language: 'en',
		selectable: false,
		destroy: false,
		rename: false,
		createFolders: false
	},
	
	hooks: {
		show: {},
		cleanup: {}
	},

	initialize: function(options){
		this.setOptions(options);
		this.dragZIndex = 1300;
		this.droppables = [];
		this.assetBasePath = this.options.assetBasePath.replace(/(\/|\\)*$/, '/');
		this.Directory = this.options.directory;
    this.listType = 'list';
    this.dialogOpen = false;
    
    this.language = $unlink(FileManager.Language.en);
		if(this.options.language != 'en') this.language = $merge(this.language, FileManager.Language[this.options.language]);  
  
		this.container = new Element('div', {'class': 'filemanager-container filemanager-engine-' + Browser.Engine.name + (Browser.Engine.trident ? Browser.Engine.version : '')});
		this.filemanager = new Element('div', {'class': 'filemanager'}).inject(this.container);
		this.header = new Element('div', {'class': 'filemanager-header'}).inject(this.filemanager);
		this.menu = new Element('div', {'class': 'filemanager-menu'}).inject(this.filemanager);
		this.loader = new Element('div', {'class': 'loader', opacity: 0, tween: {duration: 300}}).inject(this.header);
		this.previewLoader = new Element('div', {'class': 'loader', opacity: 0, tween: {duration: 300}});
		this.browserLoader = new Element('div', {'class': 'loader', opacity: 0, tween: {duration: 300}});
    // switch the path, from clickable to input text
    this.clickablePath = new Element('span', {'class': 'filemanager-dir'});
    this.selectablePath = new Element('input',{'type':'text','class': 'filemanager-dir','readonly':'readonly'})
    
    this.header.adopt(new Element('a', {href:'#','class': 'filemanager-dir-title',text: this.language.dir}).addEvent('click',(function(e){
      e.stop();
      if(this.header.getElement('span.filemanager-dir')!= null)
          this.selectablePath.replaces(this.clickablePath);
      else
        this.clickablePath.replaces(this.selectablePath);
    }).bind(this)),this.clickablePath);
    
		var self = this;
		// -> catch a click on an element in the file/folder browser
    this.relayClick = function(e) {
			if(e) e.stop();
			
			var file = this.retrieve('file');
			if (this.retrieve('edit')) {
				this.eliminate('edit');
				return;
			}
      
			if (file.mime == 'text/directory'){
				this.addClass('selected');
				self.load(self.Directory + file.name);
				return;
			}

			self.fillInfo(file);
			if (self.Current) self.Current.removeClass('selected');
			self.Current = this.addClass('selected');

			self.switchButton();
		};

    this.toggleList = function(e)
    {
      if(e) e.stop();
      $$('.filemanager-browserheader a').set('opacity',0.5);
      this.set('opacity',1);
      self.listType = (this.id == 'togggle_side_list') ? 'list' : 'thumb';
      self.load(self.Directory);
    }

    this.browsercontainer = new Element('div',{'class': 'filemanager-browsercontainer'}).inject(this.filemanager);
    this.browserheader = new Element('div',{'class': 'filemanager-browserheader'}).inject(this.browsercontainer);
    this.browserheader.adopt(this.browserLoader);
    this.browserScroll = new Element('div', {'class': 'filemanager-browserscroll'}).inject(this.browsercontainer).addEvent('mouseover',(function(){
      this.browser.getElements('span.fi.hover').each(function(span){ span.removeClass('hover'); });
    }).bind(this));
    this.browserheader.adopt([      
      new Element('a',{
        'id':'togggle_side_boxes',
        'class':'listType',
        'style' : 'margin-right: 10px;'
      }).set('opacity',0.5).addEvents({
        click: this.toggleList
      }),
      new Element('a',{
        'id':'togggle_side_list',
        'class':'listType'
      }).set('opacity',1).addEvents({
        click: this.toggleList
      })
    ]);
    
    
		this.browser = new Element('ul', {'class': 'filemanager-browser'})./*addEvents({
      click: (function(){
				return self.deselect();
			}),
			'click:relay(li span.fi)': this.relayClick
		}).*/inject(this.browserScroll);
		
		if(this.options.createFolders) this.addMenuButton('create');
		if(this.options.selectable) this.addMenuButton('open');
		
		this.info = new Element('div', {'class': 'filemanager-infos', opacity: 0}).inject(this.filemanager);

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
			new Element('dd', {'class': 'filemanager-size'})
		]).inject(this.info);
		
		this.preview = new Element('div', {'class': 'filemanager-preview'}).addEvent('click:relay(img.preview)', function(){
			self.fireEvent('preview', [this.get('src')]);
		});
		this.info.adopt([
			new Element('h2', {'class': 'filemanager-headline', text: this.language.preview}),
			this.preview
		]);
		
		this.closeIcon = new Element('a', {
			'class': 'filemanager-close',
			title: this.language.close,
			events: {click: this.hide.bind(this)}
		}).inject(this.filemanager);
		
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
		this.tips.attach(this.closeIcon.appearOn(this.closeIcon, [1, 1]).appearOn(this.filemanager, 1));
		
		this.imageadd = new Asset.image(this.assetBasePath + 'add.png', {
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
			keyboardInput: (function(e){
			  if(this.dialogOpen) return;

				if (e.key=='esc') this.hide();
				if (e.key=='up') {
          e.preventDefault();
          this.browserSelection('up');
        }
				if (e.key=='down') {
          e.preventDefault();
          this.browserSelection('down');
        }
				if (e.key=='enter') {
          e.preventDefault();
          this.browserSelection('enter');
        }
        if (e.key=='backspace') {
          e.preventDefault();
          this.browserSelection('backspace');
        }
			}).bind(this),
			scroll: (function(){
				this.filemanager.center(this.offsets);
				this.fireEvent('scroll');
				
        scrollSize = this.browsercontainer.getSize();
        headerSize = this.browserheader.getSize();
        this.browserScroll.setStyle('height',scrollSize.y - headerSize.y);

			}).bind(this)
		};		
	},

	show: function(e){
		if (e) e.stop();

		this.load(this.Directory);
		this.overlay.show();

		this.info.set('opacity', 0);
    
    this.container.setStyles({
				opacity: 0,
				display: 'block'
			});
    
    this.filemanager.center(this.offsets);
		this.fireEvent('show');
		this.container.set('opacity', 1);
		this.fireHooks('show');

		document.addEvents({
			'scroll': this.bound.scroll,
			'resize': this.bound.scroll
		});
		// add keyboard navigation
		if((Browser.Engine && (Browser.Engine.trident || Browser.Engine.webkit)) || (Browser.ie || Browser.chrome || Browser.safari))
		 document.addEvent('keydown', this.bound.keyboardInput);
		else
		 document.addEvent('keypress', this.bound.keyboardInput);
		
    scrollSize = this.browsercontainer.getSize();
    headerSize = this.browserheader.getSize();
    this.browserScroll.setStyle('height',scrollSize.y - headerSize.y);
    
    this.container.tween('opacity',1);
	},
  
	hide: function(e){
		if (e) e.stop();

		this.overlay.hide();
		this.tips.hide();
		this.browser.empty();
		this.container.setStyle('display', 'none');
		
		this.fireHooks('cleanup').fireEvent('hide');
		
		// add keyboard navigation
		document.removeEvent('scroll', this.bound.scroll).removeEvent('resize', this.bound.scroll);
		if((Browser.Engine && (Browser.Engine.trident || Browser.Engine.webkit)) || (Browser.ie || Browser.chrome || Browser.safari))
		 document.removeEvent('keydown', this.bound.keyboardInput);
		else
		 document.removeEvent('keypress', this.bound.keyboardInput);
	},

	open: function(e){
		e.stop();
    if (!this.Current) return false;
		this.fireEvent('complete', [		  
			this.normalize(this.Current.retrieve('file').path),
			this.Current.retrieve('file')
		]);
		this.hide();
	},

	create: function(e){
		e.stop();
    var input = new Element('input', {'class': 'createDirectory','autofocus':'autofocus'});
    
		var self = this;
		new Dialog(this.language.createdir, {
			language: {
				confirm: this.language.create,
				decline: this.language.cancel
			},
			content: [
				input
			],
			onOpen: this.onDialogOpen.bind(this),
			onClose: this.onDialogClose.bind(this),
			onShow: function(){
				input.addEvent('keyup', function(e){
					if (e.key == 'enter') e.target.getParent('div.dialog').getElement('button-confirm').fireEvent('click');
				}).focus();
			},
			onConfirm: function(){
				new FileManager.Request({
					url: self.options.url + '?event=create',
					onSuccess: self.fill.bind(self),
					data: {
						file: input.get('value'),
						directory: self.Directory,
						type: self.listType
					}
				}).post();
			}
		});
	},

	deselect: function(el) {
		if (el && this.Current != el) return;
    
		if (el) this.fillInfo();
		if (this.Current) this.Current.removeClass('selected');
		this.Current = null;

		this.switchButton();
	},

	load: function(dir, nofade){
		//this.deselect();
		if (!nofade) this.info.fade(0);    
    
		if (this.Request) this.Request.cancel();

		this.Request = new FileManager.Request({
			url: this.options.url,
			onRequest: (function(){        
        this.browserLoader.set('opacity', 1);
      }).bind(this),
			onSuccess: (function(j) {
				this.fill(j, nofade);
			}).bind(this),
			onComplete: (function() {
        this.browserLoader.fade(0);
      }).bind(this),
			data: {
				directory: dir,
        type: this.listType
			}
		}, this).post();
	},

	destroy: function(file){
	  var self = this;
		new Dialog(this.language.destroyfile, {
			language: {
				confirm: this.language.destroy,
				decline: this.language.cancel
			},
			onOpen: this.onDialogOpen.bind(this),
			onClose: this.onDialogClose.bind(this),
			onConfirm: function() {
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
				}).post();
			}
		});

	},

	rename: function(file) {
    var self = this;
		var name = file.name;
		var input = new Element('input', {'class': 'rename', value: name,'autofocus':'autofocus'});		
		
		if (file.mime != 'text/directory') name = name.replace(/\..*$/, '');
		
		new Dialog(this.language.renamefile, {
			language: {
				confirm: this.language.rename,
				decline: this.language.cancel
			},
			content: [
				input
			],
			onOpen: this.onDialogOpen.bind(this),
			onClose: this.onDialogClose.bind(this),
			onShow: function(){
				input.addEvent('keyup', function(e){
					if (e.key=='enter') e.target.getParent('div.dialog').getElement('button-confirm').fireEvent('click');
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
						name: input.get('value'),
						directory: self.Directory
					}
				}, self).post();
			}
		});
	},
  
  browserSelection: function(direction) {
    if(this.browser.getElement('li') == null) return;

    // folder up
    if(this.Directory && direction == 'backspace')
      this.load(this.Directory + '..');
    
    // none is selected
    if(this.browser.getElement('span.fi.hover') == null && this.browser.getElement('span.fi.selected') == null) {
      // select first folder
      this.browser.getFirst('li').getElement('span.fi').addClass('hover');
      new Fx.Scroll(this.browserScroll,{duration: 250}).toElement(this.browser.getFirst('li').getElement('span.fi'));
    } else {
      // select the current file/folder or the one with hover
      var current = null;
      if(this.browser.getElement('span.fi.hover') == null && this.browser.getElement('span.fi.selected') != null)
        current = this.browser.getElement('span.fi.selected');
      else if(this.browser.getElement('span.fi.hover') != null)
        current = this.browser.getElement('span.fi.hover');      
      var scrollHeight = (this.browserScroll.getSize().y+this.browserScroll.getScroll().y);
      var browserScrollFx = new Fx.Scroll(this.browserScroll,{duration: 250}); //offset: {x:0,y:-(this.browserScroll.getSize().y / 4)},
      
      // go down
      if(direction == 'down') {
        if(current.getParent('li').getNext('li') != null) {
          current.removeClass('hover');
          var next = current.getParent('li').getNext('li').getElement('span.fi');
          next.addClass('hover');
          if((current.getPosition(this.browserScroll).y + (current.getSize().y*2)) >= scrollHeight)
            browserScrollFx.toElement(next);
        }
      // go up
      } else if(direction == 'up') {
        if(current.getParent('li').getPrevious('li') != null) {
          current.removeClass('hover');      
          var previous = current.getParent('li').getPrevious('li').getElement('span.fi');      
          previous.addClass('hover');
          if((current.getPosition(this.browserScroll).y - current.getSize().y)<= this.browserScroll.getScroll().y)
            browserScrollFx.start(current.getPosition(this.browserScroll).x,current.getPosition(this.browserScroll).y-this.browserScroll.getSize().y)
        }
      
      // select
      } else if(direction == 'enter') {
        this.Current = current;
        if(this.browser.getElement('span.fi.selected') != null) // remove old selected one
          this.browser.getElement('span.fi.selected').removeClass('selected');
        current.addClass('selected');
        var currentFile = current.retrieve('file');        
        if(currentFile.mime == 'text/directory')
          this.load(currentFile.path.replace(this.root,''));
        else
          this.fillInfo(currentFile);      
      }
    }
  },
  
	fill: function(j, nofade) {
		this.Directory = j.path;
		this.CurrentDir = j.dir;
		if (!nofade) this.fillInfo(j.dir);
		this.browser.empty();
		this.root = j.root;
		var self = this;
		
		this.CurrentPath = this.root + this.Directory;
		var text = [], pre = [];
		var rootPath = j.root.slice(0,-1).split('/');
    rootPath.pop();
		this.CurrentPath.split('/').each(function(folderName){
			if (!folderName) return;

			pre.push(folderName);
			var path = ('/'+pre.join('/')).replace(j.root,'');
			// add non-clickable path
			if(rootPath.contains(folderName)) {
			  text.push(new Element('span', {'class': 'icon',text: folderName}));
  		// add clickable path
			} else {
        text.push(new Element('a', {
  					'class': 'icon',
  					href: '#',
  					text: folderName
  				}).addEvent('click', function(e){
  					e.stop();	
  					self.load(path);
  				})
  			);
      }
			text.push(new Element('span', {text: ' / '}));
		});
    
		text.pop();
    text[text.length-1].addClass('selected').removeEvents('click').addEvent('click', function(e){e.stop();});
		this.selectablePath.set('value','/'+this.CurrentPath);
		this.clickablePath.empty().adopt(new Element('span', {text: '/ '}), text);
    
		if (!j.files) return;

		var els = [[], []];

		Array.each(j.files, function(file) {
			file.dir = j.path;
      var extraClasses = '';
      var largeDir = '';
      // generate unique id
      var newDate = new Date;
      uniqueId = newDate.getTime();
      var icon = (this.listType == 'thumb') ? new Asset.image(file.thumbnail+'?'+uniqueId,{'class':this.listType}) : new Asset.image(file.thumbnail);
      
			var el = file.element = new Element('span', {'class': 'fi ' + this.listType + ' ' + extraClasses, href: '#'}).adopt(
        icon,
        new Element('span', {text: file.name, title:file.name})
			).store('file', file);
      
      // add click event, only to directories, files use the revert function (to enable drag n drop)
      if(file.mime == 'text/directory')
        el.addEvent('click',this.relayClick);
      
      // -> add icons
			var icons = [];
			// dowload icon
			if(file.mime!='text/directory')
				icons.push(new Asset.image(this.assetBasePath + 'disk.png', {title: this.language.download}).addClass('browser-icon').addEvent('mouseup', (function(e){
					e.preventDefault();
					el.store('edit',true);
					window.open(file.path);
				}).bind(this)).inject(el, 'top'));
      // rename, delete icon
			if(file.name != '..') {			 
			  var editButtons = new Array();
			  if(this.options.rename) editButtons.push('rename');
			  if(this.options.destroy) editButtons.push('destroy');
				editButtons.each(function(v){
					icons.push(new Asset.image(this.assetBasePath + v + '.png', {title: this.language[v]}).addClass('browser-icon').addEvent('mouseup', (function(e){
            e.preventDefault();
            el.store('edit',true);
            this.tips.hide();
            this[v](file);
          }).bind(this)).injectTop(el));
				}, this);
			}

			els[file.mime == 'text/directory' ? 1 : 0].push(el);
			//if (file.name == '..') el.set('opacity', 0.7);
			el.inject(new Element('li',{'class':this.listType}).inject(this.browser)).store('parent', el.getParent());
			icons = $$(icons.map(function(icon){return icon.appearOn(icon, [1, 0.7]);})).appearOn(el.getParent('li'), 0.7);
    }, this);
    
    // -> cancel dragging
		var self = this, revert = function(el) {
			el.set('opacity', 1).removeClass('drag').removeClass('move').setStyles({
				opacity: 1,
				'z-index': 'auto',
				position: 'relative',
				width: 'auto',
				left: 0,
				top: 0
			}).inject(el.retrieve('parent'));
			//el.getElements('img.browser-icon').set('opacity', 0);
			
			document.removeEvents('keydown', self.bound.keydown).removeEvents('keyup', self.bound.keydown);
			self.imageadd.fade(0);

			self.relayClick.apply(el);
		};
		
		// -> make dragable
		$$(els[0]).makeDraggable({
			droppables: $$(this.droppables, els[1]),
			//stopPropagation: true,

			onDrag: function(el, e){
				self.imageadd.setStyles({
					left: e.page.x + 20,
					top: e.page.y + 20,
				});
				self.imageadd.fade('in');
			},

			onBeforeStart: function(el){
				self.deselect();
				self.tips.hide();
				var position = el.getPosition();
				el.addClass('drag').setStyles({
					'z-index': self.dragZIndex,
					position: 'absolute',
					width: el.getWidth() - el.getStyle('paddingLeft').toInt() - el.getStyle('paddingRight').toInt(),
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
					(function(){droppable.removeClass('selected');}).delay(300);
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

	fillInfo: function(file) {
		if (!file) file = this.CurrentDir;

		if (!file) return;
		var size = this.size(file.size);
    
    var icon = file.icon;

		this.info.fade(1).getElement('img').set({
			src: icon,
			alt: file.mime
		});
		
		this.fireHooks('cleanup');
		this.preview.empty();

		this.info.getElement('h1').set('text', file.name);
		this.info.getElement('h1').set('title', file.name);
		this.info.getElement('dd.filemanager-modified').set('text', file.date);
		this.info.getElement('dd.filemanager-type').set('text', file.mime);
		this.info.getElement('dd.filemanager-size').set('text', !size[0] && size[1] == 'Bytes' ? '-' : (size.join(' ') + (size[1] != 'Bytes' ? ' (' + file.size + ' Bytes)' : '')));
		this.info.getElement('h2.filemanager-headline').setStyle('display', file.mime == 'text/directory' ? 'none' : 'block');

		if (file.mime=='text/directory') return;

		if (this.Request) this.Request.cancel();

		this.Request = new FileManager.Request({
			url: this.options.url + '?event=detail',
			onRequest: (function() {
        this.previewLoader.inject(this.preview);
        this.previewLoader.set('opacity', 1);
      }).bind(this),
			onSuccess: (function(j) {
			  
			  this.previewLoader.fade(0).get('tween').chain((function() {
          this.previewLoader.dispose();
			  
  				var prev = this.preview.removeClass('filemanager-loading').set('html', j && j.content ? j.content.substitute(this.language, /\\?\$\{([^{}]+)\}/g) : '').getElement('img.preview');
  				if (prev) prev.addEvent('load', function(){
  					this.setStyle('background', 'none');
  				});
          
  				var els = this.preview.getElements('button');
  				if (els) els.addEvent('click', function(e){
  					e.stop();
  					window.open(this.get('value'));
  				});
  				
  				// add SqueezeBox
          if(typeof SqueezeBox != 'undefined')
            SqueezeBox.assign($$('a[rel=preview]'));

        }).bind(this));
        
			}).bind(this),
			onFailure: (function() {
        this.previewLoader.dispose();
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
  
  // adds buttons to the file main menu, which onClick start a method with the same name
	addMenuButton: function(name) {
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
	
	onRequest: function(){this.loader.set('opacity', 1);},
	onComplete: function(){this.loader.fade(0);},
	onDialogOpen: function(){this.dialogOpen = true; this.onDialogOpenWhenUpload.apply(this);},
	onDialogClose: function(){this.dialogOpen = false; this.onDialogCloseWhenUpload.apply(this);},
	onDialogOpenWhenUpload: function(){},
	onDialogCloseWhenUpload: function(){},
	onDragComplete: function(){} // $lambda(false)
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