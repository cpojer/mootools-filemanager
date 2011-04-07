/*
 * ---
 *
 * description: FileManager
 *
 * authors: Christoph Pojer (@cpojer), Fabian Vogelsteller (@frozeman)
 *
 * license: MIT-style license
 *
 * requires:
 *  core/1.3.x: '*'
 *  more/1.3.x: [Array.Extras, String.QueryString, Hash, Element.Delegation, Element.Measure, Fx.Scroll, Fx.SmoothScroll, Drag, Drag.Move, Assets, Tips ]
 *
 * provides: Filemanager
 *
 * ...
 */

var MooFileManagerUniqueID = 1;
var FileManager = new Class({

	Implements: [Options, Events],

	Request: null,
	Directory: null,
	Current: null,
	ID: null,

	options: {
		/*
		 * onComplete: function(           // Fired when the 'Select' button is clicked
		 *                      path,      // URLencoded absolute URL path to selected file
		 *                      file,      // the file specs object: .dir, .name, .path, .size, .date, .mime, .icon, .thumbnail
		 *                      fmobj      // reference to the FileManager instance which fired the event
		 *                     ){},
		 *
		 * onModify: function(             // Fired when either the 'Rename' or 'Delete' icons are clicked or when a file is drag&dropped.
		 *                                 // Fired AFTER the action is executed.
		 *                    file,        // a CLONE of the file specs object: .dir, .name, .path, .size, .date, .mime, .icon, .thumbnail
		 *                    json,        // The JSON data as sent by the server for this 'destroy/rename/move/copy' request
		 *                    mode,        // string specifying the action: 'destroy', 'rename', 'move', 'copy'
		 *                    fmobj        // reference to the FileManager instance which fired the event
		 *                   )
		 *
		 * onShow: function(               // Fired AFTER the file manager is rendered
		 *                  fmobj          // reference to the FileManager instance which fired the event
		 *                 )
		 *
		 * onHide: function(               // Fired AFTER the file manager is removed from the DOM
		 *                  fmobj          // reference to the FileManager instance which fired the event
		 *                 )
		 *
		 * onScroll: function(             // Cascade of the window scroll event
		 *                    e,           // reference to the event object (argument passed from the window.scroll event)
		 *                    fmobj        // reference to the FileManager instance which fired the event
		 *                   )
		 *
		 * onPreview: function(            // Fired when the preview thumbnail image is clicked
		 *                     src,        // this.get('src') ???
		 *                     fmobj,      // reference to the FileManager instance which fired the event
		 *                     el          // reference to the 'this' ~ the element which was clicked
		 *                    )
		 *
		 * onDetails: function(            // Fired when an item is picked from the files list to be previewed
		 *                                 // Fired AFTER the server request is completed and BEFORE the preview is rendered.
		 *                     json,       // The JSON data as sent by the server for this 'detail' request
		 *                     fmobj       // reference to the FileManager instance which fired the event
		 *                    )
		 *
		 * onHidePreview: function(        // Fired when the preview is hidden (e.g. when uploading)
		 *                                 // Fired BEFORE the preview is removed from the DOM.
		 *                         fmobj   // reference to the FileManager instance which fired the event
		 *                        )
		 */
		directory: '',
		url: null,
		assetBasePath: null,
		language: 'en',
		selectable: false,
		destroy: false,
		rename: false,
		move_or_copy: false,
		download: false,
		createFolders: false,
		filter: '',
		hideOnClick: false,
		hideClose: false,
		hideOverlay: false,
		hideQonDelete: false,
		listPaginationSize: 100,          // add pagination per N items for huge directories (speed up interaction)
		listPaginationAvgWaitTime: 2000,  // adaptive pagination: strive to, on average, not spend more than this on rendering a directory chunk
		propagateData: {},                // extra query parameters sent with every request to the backend
		propagateType: 'GET'             // either POST or GET
	},

	/*
	 * hook items are objects (kinda associative arrays, as they are used here), where each
	 * key item is called when the hook is invoked.
	 */
	hooks: {
		show: {},
		cleanup: {}
	},

	initialize: function(options) {
		this.setOptions(options);
		this.ID = MooFileManagerUniqueID++;
		this.dragZIndex = 1300;
		this.droppables = [];
		this.assetBasePath = this.options.assetBasePath.replace(/(\/|\\)*$/, '/');
		this.Directory = this.options.directory;
		this.listType = 'list';
		this.dialogOpen = false;
		this.usingHistory = false;
		this.fmShown = false;
		this.drop_pending = 0;           // state: 0: no drop pending, 1: copy pending, 2: move pending
		this.view_fill_timer = null;     // timer reference when fill() is working chunk-by-chunk.
		this.view_fill_startindex = 0;   // offset into the view JSON array: which part of the entire view are we currently watching?
		this.view_fill_json = null;      // the latest JSON array describing the entire list; used with pagination to hop through huge dirs without repeatedly consulting the server.
		this.listPaginationLastSize = this.options.listPaginationSize;
		this.Request = null;
		this._downloadIframe = null;
		this._downloadForm = null;

		this.language = Object.clone(FileManager.Language.en);
		if (this.options.language != 'en') this.language = Object.merge(this.language, FileManager.Language[this.options.language]);

		this.container = new Element('div', {'class': 'filemanager-container' + (Browser.opera ? ' filemanager-engine-presto' : '') + (Browser.ie ? ' filemanager-engine-trident' : '') + (Browser.ie8 ? '4' : '') + (Browser.ie9 ? '5' : '')});
		this.filemanager = new Element('div', {'class': 'filemanager'}).inject(this.container);
		this.header = new Element('div', {'class': 'filemanager-header'}).inject(this.filemanager);
		this.menu = new Element('div', {'class': 'filemanager-menu'}).inject(this.filemanager);
		this.loader = new Element('div', {'class': 'loader', opacity: 0, tween: {duration: 300}}).inject(this.header);
		this.previewLoader = new Element('div', {'class': 'loader', opacity: 0, tween: {duration: 300}});
		this.browserLoader = new Element('div', {'class': 'loader', opacity: 0, tween: {duration: 300}});
		// switch the path, from clickable to input text
		this.clickablePath = new Element('span', {'class': 'filemanager-dir'});
		this.selectablePath = new Element('input',{'type': 'text', 'class': 'filemanager-dir', 'readonly': 'readonly'});
		this.pathTitle = new Element('a', {href:'#','class': 'filemanager-dir-title',text: this.language.dir}).addEvent('click',(function(e){
			e.stop();
			if (this.header.getElement('span.filemanager-dir')!= null) {
				this.selectablePath.setStyle('width',(this.header.getSize().x - this.pathTitle.getSize().x - 55));
				this.selectablePath.replaces(this.clickablePath);
			}
			else {
				this.clickablePath.replaces(this.selectablePath);
			}
		}).bind(this));
		this.header.adopt(this.pathTitle,this.clickablePath);

		var self = this;

		this.browsercontainer = new Element('div',{'class': 'filemanager-browsercontainer'}).inject(this.filemanager);
		this.browserheader = new Element('div',{'class': 'filemanager-browserheader'}).inject(this.browsercontainer);
		this.browserheader.adopt(this.browserLoader);
		this.browserScroll = new Element('div', {'class': 'filemanager-browserscroll'}).inject(this.browsercontainer).addEvents({
			'mouseover': (function(e){
					//if (typeof console !== 'undefined' && console.log) console.log('mouseover: ' + e.relatedTarget + ', ' + e.target);

					// sync mouse and keyboard-driven browsing: the keyboard requires that we keep track of the hovered item,
					// so we cannot simply leave it to a :hover CSS style. Instead, we find out which element is currently
					// hovered:
					var row = null;
					if (e.target)
					{
						row = (e.target.hasClass('fi') ? e.target : e.target.getParent('span.fi'));
						if (row)
						{
							row.addClass('hover');
						}
					}
					this.browser.getElements('span.fi.hover').each(function(span){
						// prevent screen flicker: only remove the class for /other/ nodes:
						if (span != row) {
							span.removeClass('hover');
							var rowicons = span.getElements('img.browser-icon');
							if (rowicons)
							{
								rowicons.each(function(icon) {
									icon.set('tween', {duration: 'short'}).fade(0);
								});
							}
						}
					});

					if  (row)
					{
						var icons = row.getElements('img.browser-icon');
						if (icons)
						{
							icons.each(function(icon) {
								if (e.target == icon)
								{
									icon.set('tween', {duration: 'short'}).fade(1);
								}
								else
								{
									icon.set('tween', {duration: 'short'}).fade(0.5);
								}
							});
						}
					}
				}).bind(this),

			/* 'mouseout' */
			'mouseleave': (function(e){
					//if (typeof console !== 'undefined' && console.log) console.log('mouseout: ' + e.relatedTarget + ', ' + e.target);

					// only bother us when the mouse cursor has just left the browser area; anything inside there is handled
					// by the recurring 'mouseover' event above...
					//
					// - do NOT remove the 'hover' marker from the row; it will be used by the keyboard!
					// - DO fade out the action icons, though!
					this.browser.getElements('span.fi.hover').each(function(span){
						var rowicons = span.getElements('img.browser-icon');
						if (rowicons)
						{
							rowicons.each(function(icon) {
								icon.set('tween', {duration: 'short'}).fade(0);
							});
						}
					});

				}).bind(this)
			});
		this.browserMenu_thumb = new Element('a',{
				'id':'toggle_side_boxes',
				'class':'listType',
				'style' : 'margin-right: 10px;',
				'title': this.language.toggle_side_boxes
			}).set('opacity',0.5).addEvents({
				click: this.toggleList.bind(this)
			});
		this.browserMenu_list = new Element('a',{
				'id':'toggle_side_list',
				'class':'listType',
				'title': this.language.toggle_side_list
			}).set('opacity',1).addEvents({
				click: this.toggleList.bind(this)
			});
		this.browser_dragndrop_info = new Element('a',{
				'id':'drag_n_drop',
				'title': this.language.drag_n_drop_disabled
			}); // .setStyle('visibility', 'hidden');
		this.browser_paging = new Element('div',{
				'id':'fm_view_paging'
			}).set('opacity', 0); // .setStyle('visibility', 'hidden');
		this.browser_paging_first = new Element('a',{
				'id':'paging_goto_first'
			}).set('opacity', 1).addEvents({
				click: this.paging_goto_first.bind(this)
			});
		this.browser_paging_prev = new Element('a',{
				'id':'paging_goto_previous'
			}).set('opacity', 1).addEvents({
				click: this.paging_goto_prev.bind(this)
			});
		this.browser_paging_next = new Element('a',{
				'id':'paging_goto_next'
			}).set('opacity', 1).addEvents({
				click: this.paging_goto_next.bind(this)
			});
		this.browser_paging_last = new Element('a',{
				'id':'paging_goto_last'
			}).set('opacity', 1).addEvents({
				click: this.paging_goto_last.bind(this)
			});
		this.browser_paging_info = new Element('span',{
				'id':'paging_info',
				'text': ''
			});
		this.browser_paging.adopt([this.browser_paging_first, this.browser_paging_prev, this.browser_paging_info, this.browser_paging_next, this.browser_paging_last]);
		this.browserheader.adopt([this.browserMenu_thumb, this.browserMenu_list, this.browser_dragndrop_info, this.browser_paging]);

		this.browser = new Element('ul', {'class': 'filemanager-browser'}).inject(this.browserScroll);

		if (this.options.createFolders) this.addMenuButton('create');
		if (this.options.download) this.addMenuButton('download');
		if (this.options.selectable) this.addMenuButton('open');

		this.info = new Element('div', {'class': 'filemanager-infos', opacity: 0}).inject(this.filemanager);

		var head = new Element('div', {'class': 'filemanager-head'}).adopt([
			new Element('img', {'class': 'filemanager-icon'}),
			new Element('h1')
		]);

		// We need to group the headers and lists together because we will
		// use some CSS to reorganise a bit.  So we create "infoarea" which
		// will contain the h2 and list for the "Information", that is
		// modification date, size, directory etc...
		var infoarea = new Element('div', {'class': 'filemanager-info-area'});
		this.info.adopt([head, infoarea.adopt(new Element('h2', {text: this.language.information}))]);

		new Element('dl').adopt([
			new Element('dt', {text: this.language.modified}),
			new Element('dd', {'class': 'filemanager-modified'}),
			new Element('dt', {text: this.language.type}),
			new Element('dd', {'class': 'filemanager-type'}),
			new Element('dt', {text: this.language.size}),
			new Element('dd', {'class': 'filemanager-size'})
		]).inject(infoarea);

		this.preview = new Element('div', {'class': 'filemanager-preview'}).addEvent('click:relay(img.preview)', function(){
			self.fireEvent('preview', [this.get('src'), self, this]);
		});

		// We need to group the headers and lists together because we will
		// use some CSS to reorganise a bit.  So we create "filemanager-preview-area" which
		// will contain the h2 for the preview and also the preview content returned from
		// Backend/FileManager.php
		this.info.adopt((new Element('div', {'class': 'filemanager-preview-area'})).adopt([
			new Element('h2', {'class': 'filemanager-headline', text: this.language.more}),
			this.preview
		]));

		if (!this.options.hideClose) {
			this.closeIcon = new Element('a', {
				'class': 'filemanager-close',
				opacity: 0.5,
				title: this.language.close,
				events: {click: this.hide.bind(this)}
			}).inject(this.filemanager).addEvent('mouseover',function(){
					this.fade(1);
				}).addEvent('mouseout',function(){
					this.fade(0.5);
				});
		}

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
		if (!this.options.hideClose)
			this.tips.attach(this.closeIcon);

		this.imageadd = new Asset.image(this.assetBasePath + 'Images/add.png', {
			'class': 'browser-add'
		}).set('opacity', 0).set('tween',{duration:300}).inject(this.container);

		this.container.inject(document.body);
		if (!this.options.hideOverlay) {
			this.overlay = new Overlay(this.options.hideOnClick ? {
				events: {click: this.hide.bind(this)}
			} : null);
		}

		this.bound = {
			keydown: (function(e){
				//if (typeof console !== 'undefined' && console.log) console.log('keydown: key press: ' + e.key);
				if (e.control || e.meta) this.imageadd.fade(1);
			}).bind(this),
			keyup: (function(e){
				//if (typeof console !== 'undefined' && console.log) console.log('keyup: key press: ' + e.key);
				this.imageadd.fade(0);
			}).bind(this),
			toggleList: (function(e){
				//if (typeof console !== 'undefined' && console.log) console.log('toggleList 2 key press: ' + e.key);
				if (this.dialogOpen) return;
				if (e.key=='tab') {
					e.preventDefault();
					this.toggleList();
				}
			}).bind(this),
			keyesc:( function(e) {
				//if (typeof console !== 'undefined' && console.log) console.log('keyEsc 2 key press: ' + e.key);
				if (this.dialogOpen) return;

				if (e.key=='esc') this.hide();
			}).bind(this),
			keyboardInput: (function(e) {
				//if (typeof console !== 'undefined' && console.log) console.log('keyboardInput key press: ' + e.key);
				if (this.dialogOpen) return;
				switch (e.key) {
				case 'up':
				case 'down':
				case 'pageup':
				case 'pagedown':
				case 'home':
				case 'end':
				case 'enter':
				case 'delete':
					e.preventDefault();
					this.browserSelection(e.key);
					break;
				}
			}).bind(this),
			scroll: (function(e){
				this.fireEvent('scroll', [e, this]);
				this.fitSizes();
			}).bind(this)
		};

		// ->> autostart filemanager when set
		this.initialShow();
	},

	initialShowBase: function() {
		if (typeof jsGET != 'undefined' && jsGET.get('fmID') == this.ID) {
			this.show();
		}
		else {
			window.addEvent('jsGETloaded',(function(){
				if (typeof jsGET != 'undefined' && jsGET.get('fmID') == this.ID)
					this.show();
			}).bind(this));
		}
	},

	// overridable method:
	initialShow: function() {
		this.initialShowBase();
	},

	allow_DnD: function(j, pagesize)
	{
		if (!this.options.move_or_copy)
			return false;

		if (!j || !j.files || !pagesize)
			return true;

		return (j.files.length <= pagesize * 4);
	},

	fitSizes: function() {
		this.filemanager.center(this.offsets);
		var containerSize = this.filemanager.getSize();
		var headerSize = this.browserheader.getSize();
		var menuSize = this.menu.getSize();
		this.browserScroll.setStyle('height',containerSize.y - headerSize.y);
		this.info.setStyle('height',containerSize.y - menuSize.y);
	},

	// see also: http://cass-hacks.com/articles/discussion/js_url_encode_decode/
	// and: http://xkr.us/articles/javascript/encode-compare/
	// This is a much simplified version as we do not need exact PHP rawurlencode equivalence.
	//
	// We have one mistake to fix: + instead of %2B. We don't mind
	// that * and / remain unencoded. Not exactly RFC3986, but there you have it...
	//
	// WARNING: given the above, we ASSUME this function will ONLY be used to encode the
	//          a single URI 'path', 'query' or 'fragment' component at a time!
	escapeRFC3986: function(s) {
		return encodeURI(s.toString()).replace(/\+/g, '%2B');
	},
	unescapeRFC3986: function(s) {
		return decodeURI(s.toString());
	},

	// -> catch a click on an element in the file/folder browser
	relayClick: function(e, el) {
		if (e) e.stop();

		this.storeHistory = true;

		var file = el.retrieve('file');
		//if (typeof console !== 'undefined' && console.log) console.log('on relayClick file = ' + file.mime + ': ' + file.path + ' : ' + file.name + ' : ' + this.Directory + ', source = ' + 'retrieve');
		if (el.retrieve('edit')) {
			el.eliminate('edit');
			return;
		}
		if (file.mime == 'text/directory') {
			el.addClass('selected');
			// reset the paging to page #0 as we clicked to change directory
			this.store_view_fill_startindex(0);
			this.load(this.Directory + file.name);
			return;
		}

		// when we're right smack in the middle of a drag&drop, which may end up as a MOVE, do NOT send a 'detail' request
		// alongside (through fillInfo) as that may lock the file being moved, server-side.
		// It's good enough to disable the detail view, if we want/need to.
		//
		// Note that this.drop_pending tracks the state of the drag&drop state machine -- more functions may check this one!
		if (this.Current) {
			this.Current.removeClass('selected');
		}
		// ONLY do this when we're doing a COPY or on a failed attempt...
		// CORRECTION: as even a failed 'drop' action will have moved the cursor, we can't keep this one selected right now:
		if (this.drop_pending == 0) {
			this.Current = el.addClass('selected');
		}
		// We need to have Current assigned before fillInfo because fillInfo adds to it
		this.fillInfo(file);

		this.switchButton4Current();
	},

	toggleList: function(e) {
		//if (typeof console !== 'undefined' && console.log) console.log('togglelist: key press: ' + (e ? e.key : '---'));
		if (e) e.stop();

		$$('.filemanager-browserheader a.listType').set('opacity',0.5);
		if (!this.browserMenu_thumb.retrieve('set',false)) {
			this.browserMenu_list.store('set',false);
			this.browserMenu_thumb.store('set',true).set('opacity',1);
			this.listType = 'thumb';
			if (typeof jsGET != 'undefined') jsGET.set('fmListType=thumb');
		} else {
			this.browserMenu_thumb.store('set',false);
			this.browserMenu_list.store('set',true).set('opacity',1);
			this.listType = 'list';
			if (typeof jsGET != 'undefined') jsGET.set('fmListType=list');
		}
		//if (typeof console !== 'undefined' && console.log) console.log('on toggleList dir = ' + this.Directory + ', source = ' + '---');
		this.load(this.Directory);
	},

	hashHistory: function(vars) { // get called from the jsGET listener

		this.storeHistory = false;
		//if (typeof console !== 'undefined' && console.log) console.log(vars);
		if (vars.changed['fmPath'] == '')
			vars.changed['fmPath'] = '/';

		Object.each(vars.changed,function(value,key) {
			//if (typeof console !== 'undefined' && console.log) console.log('on hashHistory key = ' + key + ', value = ' + value + ', source = ' + '---');
			if (key == 'fmPath') {
				this.load(value);
			}

			if (key == 'fmFile') {
				this.browser.getElements('span.fi span').each((function(current) {
					current.getParent('span.fi').removeClass('hover');
					if (current.get('title') == value) {
						this.deselect();
						this.Current = current.getParent('span.fi');
						new Fx.Scroll(this.browserScroll,{duration: 250,offset:{x:0,y:-(this.browserScroll.getSize().y/4)}}).toElement(this.Current);
						this.Current.addClass('selected');
						//if (typeof console !== 'undefined' && console.log) console.log('on hashHistory @ fillInfo key = ' + key + ', value = ' + value + ', source = ' + ' - file = ' + current.getParent('span.fi').retrieve('file').name);
						this.fillInfo(this.Current.retrieve('file'));
					}
				}).bind(this));
			}
		},this);
	},

	// Add the ability to specify a path (relative to the base directory) and a file to preselect
	show: function(e, loaddir, preselect) {
		//if (typeof console !== 'undefined' && console.log) console.log('on show');
		if (e) e.stop();
		if (this.fmShown) return;
		this.fmShown = true;
		this.onShow = false;

		//if (typeof console !== 'undefined' && console.log) console.log('on show file = ' + this.Directory + ', source = ' + '---');
		if (typeof loaddir != 'undefined' && loaddir != null)
		{
			this.Directory = loaddir;
		}
		else if (typeof jsGET != 'undefined')
		{
			if (jsGET.get('fmPath') != null)
			{
				this.Directory = jsGET.get('fmPath');
			}
		}
		if (typeof preselect != 'undefined' && preselect != null)
		{
			this.onShow = true;
		}

		// get and set history
		if (typeof jsGET != 'undefined') {
			if (jsGET.get('fmFile') != null) this.onShow = true;
			if (jsGET.get('fmListType') != null) {
				$$('.filemanager-browserheader a.listType').set('opacity',0.5);
				this.listType = jsGET.get('fmListType');
				if (this.listType == 'thumb')
					this.browserMenu_thumb.store('set',true).set('opacity',1);
				else
					this.browserMenu_list.store('set',true).set('opacity',1);
			}
			jsGET.set({'fmID': this.ID, 'fmPath': this.Directory});
			this.hashListenerId = jsGET.addListener(this.hashHistory,false,this);
		}

		this.load(this.Directory, preselect);
		if (!this.options.hideOverlay)
			this.overlay.show();

		this.info.fade(0);
		this.container.fade(0).setStyles({
				display: 'block'
			});

		window.addEvents({
			'scroll': this.bound.scroll,
			'resize': this.bound.scroll
		});
		// add keyboard navigation
		//if (typeof console !== 'undefined' && console.log) console.log('add keyboard nav on show file = ' + this.Directory + ', source = ' + '---');
		document.addEvent('keydown', this.bound.toggleList);
		window.addEvent('keydown', this.bound.keyesc);
		if ((Browser.Engine && (Browser.Engine.trident || Browser.Engine.webkit)) || (Browser.ie || Browser.chrome || Browser.safari))
			document.addEvent('keydown', this.bound.keyboardInput);
		else
			document.addEvent('keypress', this.bound.keyboardInput);
		this.container.fade(1);

		this.fitSizes();
		this.fireEvent('show', [this]);
		this.fireHooks('show');
	},

	hide: function(e){
		//if (typeof console !== 'undefined' && console.log) console.log('on hide');
		if (e) e.stop();
		if (!this.fmShown) return;
		this.fmShown = false;

		// stop hashListener
		if (typeof jsGET != 'undefined') {
			jsGET.removeListener(this.hashListenerId);
			jsGET.remove(['fmID','fmPath','fmFile','fmListType','fmPageIdx']);
		}

		if (!this.options.hideOverlay)
			this.overlay.hide();
		this.tips.hide();
		this.browser.empty();
		this.container.setStyle('display', 'none');

		// remove keyboard navigation
		//if (typeof console !== 'undefined' && console.log) console.log('REMOVE keyboard nav on hide');
		window.removeEvent('scroll', this.bound.scroll).removeEvent('resize', this.bound.scroll);
		document.removeEvent('keydown', this.bound.toggleList);
		window.removeEvent('keydown', this.bound.keyesc);
		if ((Browser.Engine && (Browser.Engine.trident || Browser.Engine.webkit)) || (Browser.ie || Browser.chrome || Browser.safari))
			document.removeEvent('keydown', this.bound.keyboardInput);
		else
			document.removeEvent('keypress', this.bound.keyboardInput);

		this.fireHooks('cleanup');
		this.fireEvent('hide', [this]);
	},

	open_on_click: function(e){
		e.stop();
		if (!this.Current) return;
		var file = this.Current.retrieve('file');
		this.fireEvent('complete', [
			this.escapeRFC3986(this.normalize('/' + this.root + file.dir + file.name)), // the absolute URL for the selected file, rawURLencoded
			file,                 // the file specs: .dir, .name, .path, .size, .date, .mime, .icon, .thumbnail
			this
		]);
		this.hide();
	},

	download_on_click: function(e) {
		e.stop();
		if (!this.Current) return;
		//if (typeof console !== 'undefined' && console.log) console.log('download: ' + this.Current.retrieve('file').path + ', ' + this.normalize(this.Current.retrieve('file').path));
		var file = this.Current.retrieve('file');
		this.download(file);
	},

	download: function(file) {
		// the chained display:none code inside the Tips class doesn't fire when the 'Save As' dialog box appears right away (happens in FF3.6.15 at least):
		if (this.tips.tip) {
			this.tips.tip.setStyle('display', 'none');
		}

		// discard old iframe, if it exists:
		if (this._downloadIframe)
		{
			// remove fro the menu (dispose) and trash it (destroy)
			this._downloadIframe.dispose().destroy();
			this._downloadIframe = null;
		}
		if (this._downloadForm)
		{
			// remove fro the menu (dispose) and trash it (destroy)
			this._downloadForm.dispose().destroy();
			this._downloadForm = null;
		}

		this._downloadIframe = (new IFrame).set({src: 'about:blank', name: '_downloadIframe'}).setStyles({display:'none'});
		this.menu.adopt(this._downloadIframe);

		this._downloadForm = new Element('form', {target: '_downloadIframe', method: 'post'});
		this.menu.adopt(this._downloadForm);

		if (this.options.propagateType == 'POST')
		{
			var self = this;
			Object.each(this.options.propagateData, function(v, k) {
				self._downloadForm.adopt((new Element('input')).set({type:'hidden', name: k, value: v}));
			});
		}

		this._downloadForm.action = this.options.url + (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({}, (this.options.propagateType == 'GET' ? this.options.propagateData : {}), {
			event: 'download',
			file: this.normalize(file.dir + file.name),
			filter: this.options.filter
		  }));

		return this._downloadForm.submit();
	},

	create_on_click: function(e) {
		e.stop();
		var input = new Element('input', {'class': 'createDirectory', 'autofocus': 'autofocus'});

		new FileManager.Dialog(this.language.createdir, {
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
				//if (typeof console !== 'undefined' && console.log) console.log('add key up on create dialog:onshow');
				input.addEvent('keyup', function(e){
					if (e.key == 'enter') e.target.getParent('div.dialog').getElement('button.dialog-confirm').fireEvent('click');
				}).focus();
			},
			onConfirm: (function() {
				if (this.Request) this.Request.cancel();

				// abort any still running ('antiquated') fill chunks and reset the store before we set up a new one:
				this.reset_view_fill_store();

				this.Request = new FileManager.Request({
					url: this.options.url + (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({}, {
						event: 'create'
					})),
					data: {
						file: input.get('value'),
						directory: this.Directory,
						type: this.listType,
						filter: this.options.filter
					},
					onRequest: function(){},
					onSuccess: (function(j) {
						if (!j || !j.status) {
							// TODO: include j.error in the message, iff j.error exists
							new FileManager.Dialog(('' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g) , {language: {confirm: this.language.ok}, buttons: ['confirm']});
							this.browserLoader.fade(0);
							return;
						}

						// make sure we store the JSON list!
						this.reset_view_fill_store(j);

						// the 'view' request may be an initial reload: keep the startindex (= page shown) intact then:
						this.fill(j, this.get_view_fill_startindex());
						//this.browserLoader.fade(0);
					}).bind(this),
					onComplete: function(){},
					onError: (function(text, error) {
						this.showError(text);
						this.browserLoader.fade(0);
					}).bind(this),
					onFailure: (function(xmlHttpRequest) {
						var text = this.cvtXHRerror2msg(xmlHttpRequest);
						this.showError(text);
						this.browserLoader.fade(0);
					}).bind(this)
				}, this).send();
			}).bind(this)
		});
	},

	deselect: function(el) {
		if (el && this.Current != el) return;
		//if (typeof console !== 'undefined' && console.log) console.log('deselect:Current');
		if (el) {
			this.fillInfo();
		}
		if (this.Current) {
			this.Current.removeClass('selected');
		}
		this.Current = null;
		this.switchButton4Current();
	},

	// add the ability to preselect a file in the dir
	load: function(dir, preselect) {

		this.deselect();
		this.info.fade(0);

		if (this.Request) this.Request.cancel();

		//if (typeof console !== 'undefined' && console.log) console.log("### 'view' request: onRequest invoked");

		// abort any still running ('antiquated') fill chunks and reset the store before we set up a new one:
		this.reset_view_fill_store();

		//if (typeof console !== 'undefined' && console.log) console.log('view URI: ' + this.options.url + ', ' + (this.options.url.indexOf('?') == -1 ? '?' : '&') + ', ' + Object.toQueryString(Object.merge({}, this.options.propagateData, {    event: 'view'  })));
		this.Request = new FileManager.Request({
			url: this.options.url + (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({}, {
				event: 'view'
			})),
			data: {
				directory: dir,
				type: this.listType,
				filter: this.options.filter,
				file_preselect: preselect
			},
			onRequest: function(){},
			onSuccess: (function(j) {
				//if (typeof console !== 'undefined' && console.log) console.log("### 'view' request: onSuccess invoked");
				if (!j || !j.status) {
					// TODO: include j.error in the message, iff j.error exists
					new FileManager.Dialog(('' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g) , {language: {confirm: this.language.ok}, buttons: ['confirm']});
					this.browserLoader.fade(0);
					return;
				}

				// make sure we store the JSON list!
				this.reset_view_fill_store(j);

				// the 'view' request may be an initial reload: keep the startindex (= page shown) intact then:
				// Xinha: add the ability to preselect a file in the dir
				var start_idx = this.get_view_fill_startindex();
				preselect = null;
				if (j.preselect_index >= 0)
				{
					start_idx = j.preselect_index;
					preselect = j.preselect_name;
				}
				this.fill(j, start_idx, null, null, preselect);
				//this.browserLoader.fade(0);
			}).bind(this),
			onComplete: (function() {
				//if (typeof console !== 'undefined' && console.log) console.log("### 'view' request: onComplete invoked");
				this.fitSizes();
			}).bind(this),
			onError: (function(text, error) {
				// a JSON error
				//if (typeof console !== 'undefined' && console.log) console.log("### 'view' request: onError invoked");
				this.showError(text);
				this.browserLoader.fade(0);
			}).bind(this),
			onFailure: (function(xmlHttpRequest) {
				// a generic (non-JSON) communication failure
				//if (typeof console !== 'undefined' && console.log) console.log("### 'view' request: onFailure invoked");
				var text = this.cvtXHRerror2msg(xmlHttpRequest);
				this.showError(text);
				this.browserLoader.fade(0);
			}).bind(this)
		}, this).send();
	},

	destroy_noQasked: function(file) {

		if (this.Request) this.Request.cancel();

		this.browserLoader.fade(1);

		this.Request = new FileManager.Request({
			url: this.options.url + (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({}, {
				event: 'destroy'
			})),
			data: {
				file: file.name,
				directory: this.Directory,
				filter: this.options.filter
			},
			onRequest: function(){},
			onSuccess: (function(j) {
				if (!j || !j.status) {
					// TODO: include j.error in the message, iff j.error exists
					var emsg = ('' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g);
					new FileManager.Dialog(this.language.nodestroy + ' (' + emsg + ')', {language: {confirm: this.language.ok}, buttons: ['confirm']});
					this.browserLoader.fade(0);
					return;
				}

				this.fireEvent('modify', [Object.clone(file), j, 'destroy', this]);
				var p = file.element.getParent();
				if (p) {
					p.fade(0).get('tween').chain(function(){
						this.element.destroy();
					});
				}
				this.deselect(file.element);
				this.browserLoader.fade(0);
			}).bind(this),
			onComplete: function(){},
			onError: (function(text, error) {
				this.showError(text);
				this.browserLoader.fade(0);
			}).bind(this),
			onFailure: (function(xmlHttpRequest) {
				var text = this.cvtXHRerror2msg(xmlHttpRequest);
				this.showError(text);
				this.browserLoader.fade(0);
			}).bind(this)
		}, this).send();
	},

	destroy: function(file){
		if (this.options.hideQonDelete) {
			this.destroy_noQasked(file);
		}
		else {
			new FileManager.Dialog(this.language.destroyfile, {
				language: {
					confirm: this.language.destroy,
					decline: this.language.cancel
				},
				onOpen: this.onDialogOpen.bind(this),
				onClose: this.onDialogClose.bind(this),
				onConfirm: (function() {
					this.destroy_noQasked(file);
				}).bind(this)
			});
		}
	},

	rename: function(file) {
		var name = file.name;
		var input = new Element('input', {'class': 'rename', value: name, 'autofocus': 'autofocus'});

		// if (file.mime != 'text/directory') name = name.replace(/\..*$/, '');     -- unused

		new FileManager.Dialog(this.language.renamefile, {
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
				//if (typeof console !== 'undefined' && console.log) console.log('add key up on rename dialog:onshow');
				input.addEvent('keyup', function(e){
					if (e.key=='enter') e.target.getParent('div.dialog').getElement('button.dialog-confirm').fireEvent('click');
				}).focus();
			},
			onConfirm: (function(){
				if (this.Request) this.Request.cancel();

				this.browserLoader.fade(1);

				this.Request = new FileManager.Request({
					url: this.options.url + (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({},  {
						event: 'move'
					})),
					data: {
						file: file.name,
						name: input.get('value'),
						directory: this.Directory,
						filter: this.options.filter
					},
					onRequest: function(){},
					onSuccess: (function(j) {
						if (!j || !j.status) {
							// TODO: include j.error in the message, iff j.error exists
							new FileManager.Dialog(('' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g) , {language: {confirm: this.language.ok}, buttons: ['confirm']});
							this.browserLoader.fade(0);
							return;
						}
						this.fireEvent('modify', [Object.clone(file), j, 'rename', this]);
						file.element.getElement('span.filemanager-filename').set('text', j.name).set('title', j.name);
						file.element.addClass('selected');
						file.name = j.name;
						//if (typeof console !== 'undefined' && console.log) console.log('move : onSuccess: fillInfo: file = ' + file.name);
						this.fillInfo(file);
						this.browserLoader.fade(0);
					}).bind(this),
					onComplete: function(){},
					onError: (function(text, error) {
						this.showError(text);
						this.browserLoader.fade(0);
					}).bind(this),
					onFailure: (function(xmlHttpRequest) {
						var text = this.cvtXHRerror2msg(xmlHttpRequest);
						this.showError(text);
						this.browserLoader.fade(0);
					}).bind(this)
				}, this).send();
			}).bind(this)
		});
	},

	browserSelection: function(direction) {
		var csel;

		//if (typeof console !== 'undefined' && console.log) console.log('browserSelection : direction = ' + direction);
		if (this.browser.getElement('li') == null) return;

		if (direction == 'go-bottom')
		{
			// select first item of next page
			current = this.browser.getFirst('li').getElement('span.fi');

			// blow away any lingering 'selected' after a page switch like that
			csel = this.browser.getElement('span.fi.selected');
			if (csel != null)
				csel.removeClass('selected');
		}
		else if (direction == 'go-top')
		{
			// select last item of previous page
			current = this.browser.getLast('li').getElement('span.fi');

			// blow away any lingering 'selected' after a page switch like that
			csel = this.browser.getElement('span.fi.selected');
			if (csel != null)
				csel.removeClass('selected');
		}
		else if (this.browser.getElement('span.fi.hover') == null && this.browser.getElement('span.fi.selected') == null)
		{
			// none is selected: select first item (folder/file)
			current = this.browser.getFirst('li').getElement('span.fi');
		}
		else
		{
			// select the current file/folder or the one with hover
			var current = null;
			if (this.browser.getElement('span.fi.hover') == null && this.browser.getElement('span.fi.selected') != null) {
				current = this.browser.getElement('span.fi.selected');
			}
			else if (this.browser.getElement('span.fi.hover') != null) {
				current = this.browser.getElement('span.fi.hover');
			}
		}

		this.browser.getElements('span.fi.hover').each(function(span){
			span.removeClass('hover');
		});

		var stepsize = 1;

		switch (direction) {
		// go down
		case 'end':
			stepsize = 1E5;
			/* fallthrough */
		case 'pagedown':
			if (stepsize == 1) {
				if (current.getPosition(this.browserScroll).y + current.getSize().y * 2 < this.browserScroll.getSize().y) {
					stepsize = Math.floor((this.browserScroll.getSize().y - current.getPosition(this.browserScroll).y) / current.getSize().y) - 1;
					if (stepsize < 1)
						stepsize = 1;
				}
				else {
					stepsize = Math.floor(this.browserScroll.getSize().y / current.getSize().y);
				}
			}
			/* fallthrough */
		case 'down':
			current = current.getParent('li');
			//if (typeof console !== 'undefined' && console.log) console.log('key DOWN: stepsize = ' + stepsize);

			// when we're at the bottom of the view and there are more pages, go to the next page:
			var next = current.getNext('li');
			if (next == null)
			{
				if (this.paging_goto_next(null, 'go-bottom'))
					break;
			}
			else
			{
				for ( ; stepsize > 0; stepsize--) {
					next = current.getNext('li');
					if (next == null)
						break;
					current = next;
				}
			}
			current = current.getElement('span.fi');
			/* fallthrough */
		case 'go-bottom':        // 'faked' key sent when done shifting one pagination page down
			current.addClass('hover');
			this.Current = current;
			direction = 'down';
			break;

		// go up
		case 'home':
			stepsize = 1E5;
			/* fallthrough */
		case 'pageup':
			if (stepsize == 1) {
				// when at the top of the viewport, a full page scroll already happens /visually/ when you go up 1: that one will end up at the /bottom/, after all.
				stepsize = Math.floor(current.getPosition(this.browserScroll).y / current.getSize().y);
				if (stepsize < 1)
					stepsize = 1;
			}
			/* fallthrough */
		case 'up':
			current = current.getParent('li');
			//if (typeof console !== 'undefined' && console.log) console.log('key UP: stepsize = ' + stepsize);

			// when we're at the top of the view and there are pages before us, go to the previous page:
			var previous = current.getPrevious('li');
			if (previous == null)
			{
				if (this.paging_goto_prev(null, 'go-top'))
					break;
			}
			else
			{
				for ( ; stepsize > 0; stepsize--) {
					previous = current.getPrevious('li');
					if (previous == null)
						break;
					current = previous;
				}
			}
			current = current.getElement('span.fi');
			/* fallthrough */
		case 'go-top':        // 'faked' key sent when done shifting one pagination page up
			current.addClass('hover');
			this.Current = current;
			direction = 'up';
			break;

		// select
		case 'enter':
			this.storeHistory = true;
			this.Current = current;
			csel = this.browser.getElement('span.fi.selected');
			if (csel != null) // remove old selected one
				csel.removeClass('selected');

			current.addClass('selected');
			var currentFile = current.retrieve('file');
			//if (typeof console !== 'undefined' && console.log) console.log('on key ENTER file = ' + currentFile.mime + ': ' + currentFile.path + ', source = ' + 'retrieve');
			if (currentFile.mime == 'text/directory') {
				this.load(currentFile.dir + currentFile.name /*.replace(this.root,'')*/);
			}
			else {
				this.fillInfo(currentFile);
			}
			break;

		// delete file/directory:
		case 'delete':
			this.storeHistory = true;
			this.Current = current;
			this.browser.getElements('span.fi.selected').each(function(span){
				span.removeClass('selected');
			});

			// and before we go and delete the entry, see if we pick the next one down or up as our next cursor position:
			var parent = current.getParent('li');
			var next = parent.getNext('li');
			if (next == null) {
				next = parent.getPrevious('li');
			}
			if (next != null) {
				next = next.getElement('span.fi');
				next.addClass('hover');
			}

			var currentFile = current.retrieve('file');
			//if (typeof console !== 'undefined' && console.log) console.log('on key DELETE file = ' + currentFile.mime + ': ' + currentFile.path + ', source = ' + 'retrieve');
			this.destroy(currentFile);

			current = next;
			this.Current = current;
			break;
		}

		// make sure to scroll the view so the selected/'hovered' item is within visible range:

		//if (typeof console !== 'undefined' && console.log) console.log('key DOWN: current Y = ' + current.getPosition(this.browserScroll).y + ', H = ' + this.browserScroll.getSize().y + ', 1U = ' + current.getSize().y);
		//if (typeof console !== 'undefined' && console.log) console.log('key UP: current Y = ' + current.getPosition(this.browserScroll).y + ', H = ' + this.browserScroll.getSize().y + ', 1U = ' + current.getSize().y + ', SCROLL = ' + this.browserScroll.getScroll().y + ', SIZE = ' + this.browserScroll.getSize().y);
		if (direction != 'up' && current.getPosition(this.browserScroll).y + current.getSize().y * 2 >= this.browserScroll.getSize().y)
		{
			// make scroll duration slightly dependent on the distance to travel:
			var dy = (current.getPosition(this.browserScroll).y + current.getSize().y * 2 - this.browserScroll.getSize().y);
			dy = 50 * dy / this.browserScroll.getSize().y;
			//if (typeof console !== 'undefined' && console.log) console.log('key UP: DUR: ' + dy);
			var browserScrollFx = new Fx.Scroll(this.browserScroll, { duration: (dy < 150 ? 150 : dy > 1000 ? 1000 : parseInt(dy)) });
			browserScrollFx.toElement(current);
		}
		else if (direction != 'down' && current.getPosition(this.browserScroll).y <= current.getSize().y)
		{
			var sy = this.browserScroll.getScroll().y + current.getPosition(this.browserScroll).y - this.browserScroll.getSize().y + current.getSize().y * 2;

			// make scroll duration slightly dependent on the distance to travel:
			var dy = this.browserScroll.getScroll().y - sy;
			dy = 50 * dy / this.browserScroll.getSize().y;
			//if (typeof console !== 'undefined' && console.log) console.log('key UP: SY = ' + sy + ', DUR: ' + dy);
			var browserScrollFx = new Fx.Scroll(this.browserScroll, { duration: (dy < 150 ? 150 : dy > 1000 ? 1000 : parseInt(dy)) });
			browserScrollFx.start(current.getPosition(this.browserScroll).x, (sy >= 0 ? sy : 0));
		}
	},

	// -> cancel dragging
	revert: function(el) {
		el.fade(1).removeClass('drag').removeClass('move').setStyles({
			'z-index': 'auto',
			position: 'relative',
			width: 'auto',
			left: 0,
			top: 0
		}).inject(el.retrieve('parent'));
		// also dial down the opacity of the icons within this row (download, rename, delete):
		var icons = el.getElements('img.browser-icon');
		if (icons) {
			icons.each(function(icon) {
				icon.fade(0);
			});
		}

		//if (typeof console !== 'undefined' && console.log) console.log('REMOVE keyboard up/down on revert');
		document.removeEvent('keydown', this.bound.keydown).removeEvent('keyup', this.bound.keyup);
		this.imageadd.fade(0);

		this.relayClick.apply(this, [null, el]);
	},

	// clicked 'first' button in the paged list/thumb view:
	paging_goto_prev: function(e, kbd_dir)
	{
		if (e) e.stop();
		var startindex = this.get_view_fill_startindex();
		if (!startindex)
			return false;

		return this.paging_goto_helper(startindex - this.listPaginationLastSize, this.listPaginationLastSize, kbd_dir);
	},
	paging_goto_next: function(e, kbd_dir)
	{
		if (e) e.stop();
		var startindex = this.get_view_fill_startindex();
		if (this.view_fill_json && startindex > this.view_fill_json.files.length - this.listPaginationLastSize)
			return false;

		return this.paging_goto_helper(startindex + this.listPaginationLastSize, this.listPaginationLastSize, kbd_dir);
	},
	paging_goto_first: function(e, kbd_dir)
	{
		if (e) e.stop();
		var startindex = this.get_view_fill_startindex();
		if (!startindex)
			return false;

		return this.paging_goto_helper(0, null, kbd_dir);
	},
	paging_goto_last: function(e, kbd_dir)
	{
		if (e) e.stop();
		var startindex = this.get_view_fill_startindex();
		if (this.view_fill_json && startindex > this.view_fill_json.files.length - this.options.listPaginationSize)
			return false;

		return this.paging_goto_helper(2E9 /* ~ maxint */, null, kbd_dir);
	},
	paging_goto_helper: function(startindex, pagesize, kbd_dir)
	{
		// similar activity as load(), but without the server communication...
		this.deselect();
		this.info.fade(0);

		// if (this.Request) this.Request.cancel();

		// abort any still running ('antiquated') fill chunks and reset the store before we set up a new one:
		//this.reset_view_fill_store();
		clearTimeout(this.view_fill_timer);
		this.view_fill_timer = null;

		return this.fill(null, startindex, pagesize, kbd_dir);
	},

	// Xinha: add the ability to preselect a file in the dir
	fill: function(j, startindex, pagesize, kbd_dir, preselect) {

		if (!pagesize)
		{
			pagesize = this.options.listPaginationSize;
			this.listPaginationLastSize = pagesize;
		}
		// else: pagesize specified means stick with that one. (useful to keep pagesize intact when going prev/next)

		if (!j)
		{
			j = this.view_fill_json;
		}

		startindex = parseInt(startindex);     // make sure it's an int number
		if (!pagesize)
		{
			// no paging: always go to position 0 then!
			startindex = 0;
		}
		else if (startindex > j.files.length)
		{
			startindex = j.files.length;
		}
		else if (startindex < 0)
		{
			startindex = 0;
		}
		// always make sure startindex is exactly on a page edge: this is important to keep the page numbers
		// in the tooltips correct!
		startindex = Math.floor(startindex / pagesize);
		startindex *= pagesize;

		// keyboard navigation sets the 'hover' class on the 'current' item: remove any of those:
		this.browser.getElements('span.fi.hover').each(function(span){
			span.removeClass('hover');
		});

		this.root = j.root;
		this.Directory = j.path;
		this.CurrentDir = j.dir;
		if (!this.onShow) {
			//if (typeof console !== 'undefined' && console.log) console.log('fill internal: fillInfo: file = ' + j.dir.name);
			this.fillInfo(j.dir);
		}
		this.browser.empty();

		// set history
		if (typeof jsGET != 'undefined' && this.storeHistory && j.dir.mime == 'text/directory')
			jsGET.set({'fmPath':j.path});

		this.CurrentPath = this.normalize(this.root + this.Directory);
		var text = [], pre = [];
		// on error reported by backend, there WON'T be a JSON 'root' element at all times:
		//
		// TODO: how to handle that error condition correctly?
		if (!j.root)
		{
			new FileManager.Dialog(('${error}: ' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g) , {language: {confirm: this.language.ok}, buttons: ['confirm']});
			return false;
		}
		var rootPath = j.root.slice(0,-1).split('/');
		rootPath.pop();
		this.CurrentPath.split('/').each((function(folderName){
			if (!folderName) return;

			pre.push(folderName);
			var path = ('/'+pre.join('/')+'/').replace(j.root,'');
			//if (typeof console !== 'undefined' && console.log) console.log('on fill file = ' + j.root + ' : ' + path + ' : ' + folderName + ', source = ' + 'JSON');
			if (rootPath.contains(folderName)) {
				// add non-clickable path
				text.push(new Element('span', {'class': 'icon', text: folderName}));
			} else {
				// add clickable path
				text.push(new Element('a', {
						'class': 'icon',
						href: '#',
						text: folderName
					}).addEvent('click', (function(e){
						e.stop();
						this.load(path);
					}).bind(this))
				);
			}
			text.push(new Element('span', {text: ' / '}));
		}).bind(this));

		text.pop();
		text[text.length-1].addClass('selected').removeEvents('click').addEvent('click', function(e) {
			e.stop();
		});
		this.selectablePath.set('value','/'+this.CurrentPath);
		this.clickablePath.empty().adopt(new Element('span', {text: '/ '}), text);

		if (!j.files) {
			return false;
		}

		// ->> generate browser list
		var els = [[], []];

		/*
		 * For very large directories, where the number of directories in there and/or the number of files is HUGE (> 200),
		 * we DISABLE drag&drop functionality.
		 *
		 * Yes, we could have opted for the alternative, which is splitting up the .makeDraggable() activity in multiple
		 * setTimeout(callback, 0) initiated chunks in order to spare the user the hassle of a 'slow script' dialog,
		 * but in reality drag&drop is ludicrous in such an environment; currently we do not (yet) support autoscrolling
		 * the list to enable drag&dropping it to elements further away that the current viewport can hold at the same time,
		 * but drag&drop in a 500+ image carrying directory is resulting in a significant load of the browser anyway;
		 * alternative means to move/copy files should be provided in such cases instead.
		 *
		 * Hence we run through the list here and abort / limit the drag&drop assignment process when the hardcoded number of
		 * directories or files have been reached (support_DnD_for_this_dir).
		 *
		 * TODO: make these numbers 'auto adaptive' based on timing measurements: how long does it take to initialize
		 *       a view on YOUR machine? --> adjust limits accordingly.
		 */
		var support_DnD_for_this_dir = this.allow_DnD(j, pagesize);
		var starttime = new Date().getTime();
		//if (typeof console !== 'undefined' && console.log) console.log('fill list size = ' + j.files.length);

		var endindex = j.files.length;
		var paging_now = 0;
		if (pagesize)
		{
			// endindex MAY point beyond j.files.length; that's okay; we check the boundary every time in the other fill chunks.
			endindex = startindex + pagesize;
			// however for reasons of statistics gathering, we keep it bound to j.files.length at the moment:
			if (endindex > j.files.length) endindex = j.files.length;

			if (pagesize < j.files.length)
			{
				var pagecnt = Math.ceil(j.files.length / pagesize);
				var curpagno = Math.floor(startindex / pagesize) + 1;

				this.browser_paging_info.set('text', 'P:' + curpagno);

				if (curpagno > 1)
				{
					this.browser_paging_first.set('title', this.language.goto_page + ' 1');
					this.browser_paging_first.fade(1);
					this.browser_paging_prev.set('title', this.language.goto_page + ' ' + (curpagno - 1));
					this.browser_paging_prev.fade(1);
				}
				else
				{
					this.browser_paging_first.set('title', '---');
					this.browser_paging_first.fade(0.25);
					this.browser_paging_prev.set('title', '---');
					this.browser_paging_prev.fade(0.25);
				}
				if (curpagno < pagecnt)
				{
					this.browser_paging_last.set('title', this.language.goto_page + ' ' + pagecnt);
					this.browser_paging_last.fade(1);
					this.browser_paging_next.set('title', this.language.goto_page + ' ' + (curpagno + 1));
					this.browser_paging_next.fade(1);
				}
				else
				{
					this.browser_paging_last.set('title', '---');
					this.browser_paging_last.fade(0.25);
					this.browser_paging_next.set('title', '---');
					this.browser_paging_next.fade(0.25);
				}

				paging_now = 1;
			}
		}
		this.browser_paging.fade(paging_now);
		// fix for MSIE8: also fade out the pagination icons themselves
		if (!paging_now)
		{
			this.browser_paging_first.fade(0);
			this.browser_paging_prev.fade(0);
			this.browser_paging_last.fade(0);
			this.browser_paging_next.fade(0);
		}

		// remember pagination position history
		this.store_view_fill_startindex(startindex);

		this.view_fill_timer = this.fill_chunkwise_1.delay(1, this, [startindex, endindex, endindex - startindex, pagesize, support_DnD_for_this_dir, starttime, els, kbd_dir, preselect]);

		return true;
	},

	list_row_maker: function(thumbnail_url, file)
	{
		return file.element = new Element('span', {'class': 'fi ' + this.listType, href: '#'}).adopt(
			new Element('span', {
				'class': this.listType,
				'style': thumbnail_url ? 'background-image: url(' + thumbnail_url + ')' : 'background-image: url(' + this.assetBasePath + 'Images/loader.gif' + ')'
			}).addClass('fm-thumb-bg') /* .adopt(icon) */ ,
			new Element('span', {'class': 'filemanager-filename', text: file.name, title: file.name})
		).store('file', file);
	},

	/*
	 * The old one-function-does-all fill() would take an awful long time when processing large directories. This function
	 * contains the most costly code chunk of the old fill() and has adjusted the looping through the j.files[] list
	 * in such a way that we can 'chunk it up': we can measure the time consumed so far and when we have spent more than
	 * X milliseconds in the loop, we stop and allow the loop to commence after a minimal delay.
	 *
	 * The delay is the way to relinquish control to the browser and as a thank-you NOT get the dreaded
	 * 'slow script, continue or abort?' dialog in your face. Ahh, the joy of cooperative multitasking is back again! :-)
	 */
	fill_chunkwise_1: function(startindex, endindex, render_count, pagesize, support_DnD_for_this_dir, starttime, els, kbd_dir, preselect) {

		var idx;
		var self = this;
		var j = this.view_fill_json;
		var loop_starttime = new Date().getTime();

		var duration = new Date().getTime() - starttime;
		//if (typeof console !== 'undefined' && console.log) console.log(' + fill_chunkwise_1(' + startindex + ') @ ' + duration);

		/*
		 * Note that the < j.files.length check MUST be kept around: one of the fastest ways to abort/cancel
		 * the render is emptying the files[] array, as that would abort the loop on the '< j.files.length'
		 * condition.
		 *
		 * This, together with killing our delay-timer, is done when anyone calls reset_view_fill_store() to
		 * abort this render pronto.
		 */
		for (idx = startindex; idx < endindex && idx < j.files.length; idx++)
		{
			var file = j.files[idx];

			if (idx % 10 == 0) {
				// try not to spend more than 100 msecs per (UI blocking!) loop run!
				var loop_duration = new Date().getTime() - loop_starttime;
				duration = new Date().getTime() - starttime;
				//if (typeof console !== 'undefined' && console.log) console.log('time taken so far = ' + duration + ' / ' + loop_duration + ' @ elcnt = ' + idx);

				/*
				 * Are we running in adaptive pagination mode? yes: calculate estimated new pagesize and adjust average (EMA) when needed.
				 *
				 * Do this here instead of at the very end so that pagesize will adapt, particularly when user does not want to wait for
				 * this render to finish.
				 */
				this.adaptive_update_pagination_size(idx, endindex, render_count, pagesize, duration, 1.0 / 7.0, 1.1, 0.1 / 1000);

				if (loop_duration >= 100)
				{
					this.view_fill_timer = this.fill_chunkwise_1.delay(1, this, [idx, endindex, render_count, pagesize, support_DnD_for_this_dir, starttime, els, kbd_dir, preselect]);
					return; // end call == break out of loop
				}
			}

			file.dir = j.path;
			var largeDir = '';
			//// generate unique id
			//var newDate = new Date;
			//uniqueId = newDate.getTime();

			//if (typeof console !== 'undefined' && console.log) console.log('thumbnail: "' + file.thumbnail + '"');
			//var icon = (this.listType == 'thumb') ? new Asset.image(file.thumbnail /* +'?'+uniqueId */, {'class':this.listType}) : new Asset.image(file.thumbnail);
			var isdir = (file.mime == 'text/directory');
			var el;

			if (file.thumbnail.indexOf('.php?') == -1)
			{
				// This is just a raw image
				el = this.list_row_maker(file.thumbnail, file);
			}
			else if (this.options.propagateType == 'POST')
			{
				// We must AJAX POST our propagateData, so we need to do the post and take the url to the
				// thumbnail from the post results.
				//
				// The alternative here, taking only 1 round trip instead of 2, would have been to FORM POST
				// to a tiny iframe, which is suitably sized to contain the generated thumbnail and the POST
				// actually returning the binary image data, thus the iframe contents becoming the thumbnail image.

				el = (function(file) {           // Closure
					var list_row = this.list_row_maker(null, file);

					new FileManager.Request({
						url: file.thumbnail,
						data: {
							asJSON: 1
						},
						onRequest: function(){},
						onSuccess: (function(j) {
							var iconpath = this.assetBasePath + 'Images/Icons/' + (this.listType == 'list' ? '' : 'Large/') + 'default-error.png';
							if (!j || !j.status)
							{
								// Should we display the error here? No, we just display the general error icon instead
								list_row.getElement('span.fm-thumb-bg').setStyle('background-image', 'url(' + iconpath + ')');
							}
							else if (j && j.thumbnail)
							{
								list_row.getElement('span.fm-thumb-bg').setStyle('background-image', 'url(' + j.thumbnail + ')');
							}
							else
							{
								list_row.getElement('span.fm-thumb-bg').setStyle('background-image', 'url(' + iconpath + ')');
							}
						}).bind(this),
						onError: (function(text, error) {
							var iconpath = this.assetBasePath + 'Images/Icons/' + (this.listType == 'list' ? '' : 'Large/') + 'default-error.png';
							list_row.getElement('span.fm-thumb-bg').setStyle('background-image', 'url(' + iconpath + ')');
						}).bind(this),
						onFailure: (function(xmlHttpRequest) {
							var iconpath = this.assetBasePath + 'Images/Icons/' + (this.listType == 'list' ? '' : 'Large/') + 'default-error.png';
							list_row.getElement('span.fm-thumb-bg').setStyle('background-image', 'url(' + iconpath + ')');
						}).bind(this)
					}, this).send();

					return list_row;
				}).bind(this)(file);
			}
			else
			{
				// If we are using GET, append the data to the url
				el = this.list_row_maker(file.thumbnail + '&' + Object.toQueryString(this.options.propagateData), file);
			}

			/*
			 * WARNING: for some (to me) incomprehensible reason the old code which bound the event handlers to 'this==self' and which used the 'el' variable
			 *          available here, does NOT WORK ANY MORE - tested in FF3.6. Turns out 'el' is pointing anywhere but where you want it by the time
			 *          the event handler is executed.
			 *
			 *          The 'solution' which I found was to rely on the 'self' reference instead and bind to 'el'. If the one wouldn't work, the other shouldn't,
			 *          but there you have it: this way around it works. FF3.6.14 :-(
			 *
			 * EDIT 2011/03/16: the problem started as soon as the old Array.each(function(...){...}) by the chunked code which uses a for loop:
			 *
			 *              http://jibbering.com/faq/notes/closures/
			 *
			 *          as it says there:
			 *
			 *              A closure is formed when one of those inner functions is made accessible outside of the function in which it was
			 *              contained, so that it may be executed after the outer function has returned. At which point it still has access to
			 *              the local variables, parameters and inner function declarations of its outer function. Those local variables,
			 *              parameter and function declarations (initially) >>>> have the values that they had when the outer function returned <<<<
			 *              and may be interacted with by the inner function.
			 *
			 *          The >>>> <<<< emphasis is mine: in the .each() code, each el was a separate individual, where due to the for loop,
			 *          the last 'el' to exist at all is the one created during the last round of the loop in that chunk. Which explains the
			 *          observed behaviour before the fix: the file names associated with the 'el' element object were always pointing
			 *          at some item further down the list, not necessarily the very last one, but always these references were 'grouped':
			 *          multiple rows would produce the same filename.
			 */

			// add click event, only to directories, files use the revert function (to enable drag n drop)
			// OR provide a basic click event for files too IFF this directory is too huge to support drag & drop.
			if (isdir || !support_DnD_for_this_dir) {
				el.addEvent('click', (function(e, target) {
					//if (typeof console !== 'undefined' && console.log) console.log('is_dir:CLICK');
					//var node = $((event.currentTarget) ? e.event.currentTarget : e.event.srcElement);
					//var node = el;
					var node = this;
					self.relayClick.apply(self, [e, node]);
				}).bind(el));
			}

			// -> add icons
			//var icons = [];
			var editButtons = new Array();
			// download icon
			if (!isdir && this.options.download) {
				if (this.options.download) editButtons.push('download');
			}

			// rename, delete icon
			if (file.name != '..') {
				if (this.options.rename) editButtons.push('rename');
				if (this.options.destroy) editButtons.push('destroy');
			}

			editButtons.each(function(v){
				//icons.push(
				new Asset.image(this.assetBasePath + 'Images/' + v + '.png', {title: this.language[v]}).addClass('browser-icon').set('opacity', 0).addEvent('mouseup', (function(e, target){
					// this = el, self = FM instance
					e.preventDefault();
					this.store('edit',true);
					// can't use 'file' in here directly anymore either:
					var file = this.retrieve('file');
					self.tips.hide();
					self[v](file);
				}).bind(el)).inject(el,'top');
				//);
			}, this);

			els[isdir ? 1 : 0].push(el);
			//if (file.name == '..') el.fade(0.7);
			el.inject(new Element('li',{'class':this.listType}).inject(this.browser)).store('parent', el.getParent());
			//icons = $$(icons.map((function(icon){
			//  this.showFunctions(icon,icon,0.5,1);
			//  this.showFunctions(icon,el.getParent('li'),1);
			//}).bind(this)));

			// ->> LOAD the FILE/IMAGE from history when PAGE gets REFRESHED (only directly after refresh)
			//if (typeof console !== 'undefined' && console.log) console.log('fill on PRESELECT: onShow = ' + this.onShow + ', file = ' + file.name + ', preselect = ' + (typeof preselect != 'undefined' ? preselect : '???'));
			if (this.onShow && typeof preselect != 'undefined')
			{
				if (preselect == file.name)
				{
					this.deselect();
					this.Current = file.element;
					new Fx.Scroll(this.browserScroll,{duration: 250,offset:{x:0,y:-(this.browserScroll.getSize().y/4)}}).toElement(file.element);
					file.element.addClass('selected');
					//if (typeof console !== 'undefined' && console.log) console.log('fill on PRESELECT: fillInfo: file = ' + file.name);
					this.fillInfo(file);
				}
			}
			else if (this.onShow && typeof jsGET != 'undefined' && jsGET.get('fmFile') != null && file.name == jsGET.get('fmFile'))
			{
				this.deselect();
				this.Current = file.element;
				new Fx.Scroll(this.browserScroll,{duration: 250,offset:{x:0,y:-(this.browserScroll.getSize().y/4)}}).toElement(file.element);
				file.element.addClass('selected');
				//if (typeof console !== 'undefined' && console.log) console.log('fill: fillInfo: file = ' + file.name);
				this.fillInfo(file);
			}
			else if (this.onShow && jsGET.get('fmFile') == null)
			{
				this.onShow = false;
			}
		}

		// check how much we've consumed so far:
		duration = new Date().getTime() - starttime;
		//if (typeof console !== 'undefined' && console.log) console.log('time taken in array traversal = ' + duration);
		//starttime = new Date().getTime();

		// go to the next stage, right after these messages... ;-)
		this.view_fill_timer = this.fill_chunkwise_2.delay(1, this, [render_count, pagesize, support_DnD_for_this_dir, starttime, els, kbd_dir]);
	},

	/*
	 * See comment for fill_chunkwise_1(): the makeDraggable() is a loop in itself and taking some considerable time
	 * as well, so make it happen in a 'fresh' run here...
	 */
	fill_chunkwise_2: function(render_count, pagesize, support_DnD_for_this_dir, starttime, els, kbd_dir) {

		var duration = new Date().getTime() - starttime;
		//if (typeof console !== 'undefined' && console.log) console.log(' + fill_chunkwise_2() @ ' + duration);

		// check how much we've consumed so far:
		duration = new Date().getTime() - starttime;
		//if (typeof console !== 'undefined' && console.log) console.log('time taken in array traversal + revert = ' + duration);
		//starttime = new Date().getTime();

		if (support_DnD_for_this_dir) {
			// -> make draggable
			$$(els[0]).makeDraggable({
				droppables: $$(this.droppables.combine(els[1])),
				//stopPropagation: true,

				onDrag: (function(el, e){
					this.imageadd.setStyles({
						'left': e.page.x + 25,
						'top': e.page.y + 25
					});
					this.imageadd.fade('in');
				}).bind(this),

				onBeforeStart: (function(el){
					//if (typeof console !== 'undefined' && console.log) console.log('draggable:onBeforeStart');
					this.deselect();
					this.tips.hide();
					var position = el.getPosition();
					el.addClass('drag').setStyles({
						'z-index': this.dragZIndex,
						'position': 'absolute',
						'width': el.getWidth() - el.getStyle('paddingLeft').toInt() - el.getStyle('paddingRight').toInt(),
						'left': position.x,
						'top': position.y
					}).inject(this.container);
				}).bind(this),

				onCancel: this.revert.bind(this),

				onStart: (function(el) {
					//if (typeof console !== 'undefined' && console.log) console.log('draggable:onStart');
					el.fade(0.7).addClass('move');
					//if (typeof console !== 'undefined' && console.log) console.log('add keyboard up/down on drag start');
					document.addEvents({
						keydown: this.bound.keydown,
						keyup: this.bound.keyup
					});
				}).bind(this),

				onEnter: function(el, droppable){
					droppable.addClass('droppable');
				},

				onLeave: function(el, droppable){
					droppable.removeClass('droppable');
				},

				onDrop: (function(el, droppable, e){
					//if (typeof console !== 'undefined' && console.log) console.log('draggable:onDrop');

					var is_a_move = !(e.control || e.meta);
					this.drop_pending = 1 + is_a_move;

					if (!is_a_move || !droppable) {
						el.setStyles({left: 0, top: 0});
					}
					if ((!this.options.move_or_copy) || (is_a_move && !droppable)) {
						this.drop_pending = 0;

						this.revert(el);   // go and request the details anew, then refresh them in the view
						return;
					}

					this.revert(el);       // do not send the 'detail' request in here: this.drop_pending takes care of that!

					var dir;
					if (droppable) {
						droppable.addClass('selected').removeClass('droppable');
						(function() {
							droppable.removeClass('selected');
						}).delay(300);
						if (this.onDragComplete(el, droppable)) {
							this.drop_pending = 0;
							return;
						}

						dir = droppable.retrieve('file');
						//if (typeof console !== 'undefined' && console.log) console.log('on drop dir = ' + dir.dir + ' : ' + dir.name + ', source = ' + 'retrieve');
					}
					var file = el.retrieve('file');
					//if (typeof console !== 'undefined' && console.log) console.log('on drop file = ' + file.name + ' : ' + this.Directory + ', source = ' + 'retrieve; droppable = "' + droppable + '"');

					if (this.Request) this.Request.cancel();

					this.Request = new FileManager.Request({
						url: this.options.url + (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({},  {
							event: 'move'
						})),
						data: {
							file: file.name,
							filter: this.options.filter,
							directory: this.Directory,
							newDirectory: dir ? (dir.dir ? dir.dir + '/' : '') + dir.name : this.Directory,
							copy: is_a_move ? 0 : 1
						},
						onSuccess: (function(j) {
							if (!j || !j.status) {
								// TODO: include j.error in the message, iff j.error exists
								new FileManager.Dialog(('' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g) , {language: {confirm: this.language.ok}, buttons: ['confirm']});
								this.browserLoader.fade(0);
								return;
							}

							this.fireEvent('modify', [Object.clone(file), j, (is_a_move ? 'move' : 'copy'), this]);

							if (!dir) {
								this.load(this.Directory);
							}
							this.browserLoader.fade(0);
						}).bind(this),
						onError: (function(text, error) {
							this.showError(text);
							this.browserLoader.fade(0);
						}).bind(this),
						onFailure: (function(xmlHttpRequest) {
							var text = this.cvtXHRerror2msg(xmlHttpRequest);
							this.showError(text);
							this.browserLoader.fade(0);
						}).bind(this)
					}, this).send();

					el.fade(0).get('tween').chain(function(){
						el.getParent().destroy();
					});

					this.deselect(el);                  // and here, once again, do NOT send the 'detail' request while the 'move' is still ongoing (*async* communications!)

					// the 'move' action will probably still be running by now, but we need this only to block simultaneous requests triggered from this run itself
					this.drop_pending = 0;
				}).bind(this)
			});

			this.browser_dragndrop_info.setStyle('background-position', '0px 0px');
			this.browser_dragndrop_info.set('title', this.language.drag_n_drop);
			//this.browser_dragndrop_info.setStyle('visibility', 'hidden');
		}

		// check how much we've consumed so far:
		duration = new Date().getTime() - starttime;
		//if (typeof console !== 'undefined' && console.log) console.log(' + time taken in make draggable = ' + duration);
		//starttime = new Date().getTime();

		$$(els[0].combine(els[1])).setStyles({'left': 0, 'top': 0});

		// check how much we've consumed so far:
		duration = new Date().getTime() - starttime;
		//if (typeof console !== 'undefined' && console.log) console.log(' + time taken in setStyles = ' + duration);

		this.adaptive_update_pagination_size(render_count, render_count, render_count, pagesize, duration, 1.0 / 7.0, 1.02, 0.1 / 1000);

		// go to the next stage, right after these messages... ;-)
		this.view_fill_timer = this.fill_chunkwise_3.delay(1, this, [render_count, pagesize, support_DnD_for_this_dir, starttime, kbd_dir]);
	},

	/*
	 * See comment for fill_chunkwise_1(): the tooltips need to be assigned with each icon (2..3 per list item)
	 * and apparently that takes some considerable time as well for large directories and slightly slower machines.
	 */
	fill_chunkwise_3: function(render_count, pagesize, support_DnD_for_this_dir, starttime, kbd_dir) {

		var duration = new Date().getTime() - starttime;
		//if (typeof console !== 'undefined' && console.log) console.log(' + fill_chunkwise_3() @ ' + duration);

		this.tips.attach(this.browser.getElements('img.browser-icon'));
		this.browser_dragndrop_info.fade(1);

		// check how much we've consumed so far:
		duration = new Date().getTime() - starttime;
		//if (typeof console !== 'undefined' && console.log) console.log(' + time taken in tips.attach = ' + duration);

		// when a render is completed, we have maximum knowledge, i.e. maximum prognosis power: shorter tail on the EMA is our translation of that.
		this.adaptive_update_pagination_size(render_count, render_count, render_count, pagesize, duration, 1.0 / 5.0, 1.0, 0);

		// we're done: erase the timer so it can be garbage collected
		clearTimeout(this.view_fill_timer);
		this.view_fill_timer = null;

		// make sure the selection, when keyboard driven, is marked correctly
		if (kbd_dir)
		{
			this.browserSelection(kbd_dir);
		}

		this.browserLoader.fade(0);
	},

	adaptive_update_pagination_size: function(currentindex, endindex, render_count, pagesize, duration, EMA_factor, future_fudge_factor, compensation)
	{
		var avgwait = this.options.listPaginationAvgWaitTime;
		if (avgwait)
		{
			// we can now estimate how much time we'll need to process the entire list:
			var orig_startindex = endindex - render_count;
			var done_so_far = currentindex - orig_startindex;
			// the 1.3 is a heuristic covering for chunk_2+3 activity
			done_so_far /= parseFloat(render_count);
			// at least 5% of the job should be done before we start using our info for estimation/extrapolation
			if (done_so_far > 0.05)
			{
				/*
				 * and it turns out our fudge factors are not telling the whole story: the total number of elements
				 * to render are still a factor then.
				 */
				future_fudge_factor *= (1 + compensation * render_count);

				var t_est = duration * future_fudge_factor / done_so_far;

				// now take the configured _desired_ maximum average wait time and see how we should fare:
				var p_est = render_count * avgwait / t_est;

				// EMA + sensitivity: the closer to our current target, the better our info:
				var tail = EMA_factor * (0.9 + 0.1 * done_so_far);
				var newpsize = tail * p_est + (1 - tail) * pagesize;

				// apply limitations: never reduce more than 50%, never increase more than 20%:
				var delta = newpsize / pagesize;
				if (delta < 0.5)
					newpsize = 0.5 * pagesize;
				else if (delta > 1.2)
					newpsize = 1.2 * pagesize;
				newpsize = parseInt(newpsize);

				// and never let it drop below rediculous values:
				if (newpsize < 20)
					newpsize = 20;

				//if (typeof console !== 'undefined' && console.log) console.log('::auto-tune pagination: new page = ' + newpsize + ' @ tail:' + tail + ', p_est: ' + p_est + ', psize:' + pagesize + ', render:' + render_count + ', done%:' + done_so_far + '(' + (currentindex - orig_startindex) + '), t_est:' + t_est + ', dur:' + duration + ', pdelta: ' + delta);
				this.options.listPaginationSize = newpsize;
			}
		}
	},

	fillInfo: function(file) {

		if (!file) file = this.CurrentDir;
		if (!file) return;

		// set file history
		//if (typeof console !== 'undefined' && console.log) console.log(this.storeHistory);
		if (typeof jsGET != 'undefined' && this.storeHistory) {
			if (file.mime != 'text/directory')
				jsGET.set({'fmFile': file.name});
			else
				jsGET.set({'fmFile': ''});
		}

		var size = this.size(file.size);
		var icon = file.icon;

		this.switchButton4Current();

		if (this.drop_pending != 2) {
			// only fade up when we are allowed to send a detail request next as well and we're doing a MOVE drop
			this.info.fade(1).getElement('img').set({
				src: icon,
				alt: file.mime
			});
		}
		else {
			this.info.getElement('img').set({
				src: icon,
				alt: file.mime
			});
		}

		this.fireHooks('cleanup_preview');
		// We need to remove our custom attributes form when the preview is hidden
		this.fireEvent('hidePreview', [this]);

		this.preview.empty();

		this.info.getElement('h1').set('text', file.name);
		this.info.getElement('h1').set('title', file.name);
		this.info.getElement('dd.filemanager-modified').set('text', file.date);
		this.info.getElement('dd.filemanager-type').set('text', file.mime);
		this.info.getElement('dd.filemanager-size').set('text', !size[0] && size[1] == 'Bytes' ? '-' : (size.join(' ') + (size[1] != 'Bytes' ? ' (' + file.size + ' Bytes)' : '')));
		this.info.getElement('h2.filemanager-headline').setStyle('display', file.mime == 'text/directory' ? 'none' : 'block');

		if (file.mime=='text/directory') return;

		if (this.drop_pending != 2) {
			if (this.Request) this.Request.cancel();

			this.Request = new FileManager.Request({
				url: this.options.url + (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(Object.merge({},  {
					event: 'detail'
				})),
				data: {
					directory: this.Directory,
					file: file.name,
					filter: this.options.filter
				},
				onRequest: (function() {
					this.previewLoader.inject(this.preview);
					this.previewLoader.fade(1);
				}).bind(this),
				onSuccess: (function(j) {

					if (!j || !j.status) {
						// TODO: include j.error in the message, iff j.error exists
						new FileManager.Dialog(('' + j.error).substitute(this.language, /\\?\$\{([^{}]+)\}/g) , {language: {confirm: this.language.ok}, buttons: ['confirm']});
						this.previewLoader.dispose();
						return;
					}

					this.previewLoader.fade(0).get('tween').chain((function() {
						this.previewLoader.dispose();
					}).bind(this));

					// don't wait for the fade to finish to set up the new content
					var prev = this.preview.removeClass('filemanager-loading').set('html', j && j.content ? j.content.substitute(this.language, /\\?\$\{([^{}]+)\}/g) : '').getElement('img.preview');
					if (prev) {
						prev.addEvent('load', function(){
							this.setStyle('background', 'none');
						});
					}

					var els = this.preview.getElements('button');
					if (els) {
						els.addEvent('click', function(e){
							e.stop();
							window.open(this.get('value'));
						});
					}

					// Xinha: We need to add in a form for setting the attributes of images etc,
					// so we add this event and pass it the information we have about the item
					// as returned by Backend/FileManager.php
					this.fireEvent('details', [j, this]);

					// Xinha: We also want to hold onto the data so we can access it
					// when selecting the image.
					if (this.Current) {
						this.Current.file_data = j;
					}

					if (typeof milkbox != 'undefined')
						milkbox.reloadPageGalleries();

				}).bind(this),
				onError: (function(text, error) {
					this.previewLoader.dispose();
					this.showError(text);
				}).bind(this),
				onFailure: (function(xmlHttpRequest) {
					this.previewLoader.dispose();
					var text = this.cvtXHRerror2msg(xmlHttpRequest);
					this.showError(text);
				}).bind(this)
			}, this).send();
		}
	},

	showFunctions: function(icon,appearOn,opacityBefore,opacityAfter) {
		var opacity = [opacityBefore || 1, opacityAfter || 0];
		icon.set({
			opacity: opacity[1]
		});

		$(appearOn).addEvents({
			mouseenter: (function(){this.set('opacity',opacity[0]);}).bind(icon),
			mouseleave: (function(){this.set('opacity',opacity[1]);}).bind(icon)
		});
		return icon;
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

	switchButton4Current: function() {
		var chk = !!this.Current;
		var els = new Array();
		els.push(this.menu.getElement('button.filemanager-open'));
		els.push(this.menu.getElement('button.filemanager-download'));
		els.each(function(el){
			if (el) el.set('disabled', !chk)[(chk ? 'remove' : 'add') + 'Class']('disabled');
		});
	},

	// adds buttons to the file main menu, which onClick start a method with the same name
	addMenuButton: function(name) {
		var el = new Element('button', {
			'class': 'filemanager-' + name,
			text: this.language[name]
		}).inject(this.menu, 'top');
		if (this[name+'_on_click']) el.addEvent('click', this[name+'_on_click'].bind(this));
		return el;
	},

	// clear the view chunk timer, erase the JSON store but do NOT reset the pagination to page 0:
	// we may be reloading and we don't want to destroy the page indicator then!
	reset_view_fill_store: function(j)
	{
		//this.browser_dragndrop_info.setStyle('visibility', 'visible');
		this.browser_dragndrop_info.fade(0.5);
		this.browser_dragndrop_info.setStyle('background-position', '0px -16px');
		this.browser_dragndrop_info.set('title', this.language.drag_n_drop_disabled);

		// as this is a long-running process, make sure the hourglass-equivalent is visible for the duration:
		this.browserLoader.fade(1);

		this.browser_paging.fade(0);

		// abort any still running ('antiquated') fill chunks:
		clearTimeout(this.view_fill_timer);
		this.view_fill_timer = null;     // timer reference when fill() is working chunk-by-chunk.

		this.view_fill_startindex = 0;   // offset into the view JSON array: which part of the entire view are we currently watching?
		if (this.view_fill_json)
		{
			// make sure the old 'fill' run is aborted ASAP: clear the old files[] array to break
			// the heaviest loop in fill:
			this.view_fill_json.files = [];
		}
		this.view_fill_json = ((j && j.status) ? j : null);      // clear out the old JSON data and set up possibly new data.
		// ^^^ the latest JSON array describing the entire list; used with pagination to hop through huge dirs without repeatedly
		//     consulting the server. The server doesn't need to know we're so slow we need pagination now! ;-)
	},

	store_view_fill_startindex: function(idx)
	{
		this.view_fill_startindex = idx;
		if (typeof jsGET != 'undefined' /* && this.storeHistory */) {
			jsGET.set({'fmPageIdx': idx});
		}
	},

	get_view_fill_startindex: function(idx)
	{
		// we don't care about null, undefined or 0 here: as we keep close track of the startindex, any nonzero valued setting wins out.
		if (!idx)
		{
			idx = this.view_fill_startindex;
		}
		if (typeof jsGET != 'undefined' && !idx)
		{
			idx = jsGET.get('fmPageIdx');
		}
		return parseInt(idx ? idx : 0);
	},

	fireHooks: function(hook){
		var args = Array.slice(arguments, 1);
		for(var key in this.hooks[hook]) {
			this.hooks[hook][key].apply(this, args);
		}
		return this;
	},

	cvtXHRerror2msg: function(xmlHttpRequest) {
		var status = xmlHttpRequest.status;
		var orsc = xmlHttpRequest.onreadystatechange;
		var response = (xmlHttpRequest.responseText || this.language['backend.unidentified_error']);

		var text = response.substitute(this.language, /\\?\$\{([^{}]+)\}/g);
		return text;
	},

	showError: function(text) {
		var errorText = text;

		if (!errorText) {
			errorText = this.language['backend.unidentified_error'];
		}
		else if (errorText.indexOf('{') != -1) {
			errorText = errorText.substring(0,errorText.indexOf('{'));
		}

		new FileManager.Dialog(this.language.error, {
			buttons: ['confirm'],
			language: {
				confirm: this.language.ok
			},
			content: [
				errorText
			],
			onOpen: this.onDialogOpen.bind(this),
			onClose: this.onDialogClose.bind(this)
		});
	},

	showMessage: function(textOrElement, title) {
		if (!title) title = '';
		new FileManager.Dialog(title, {
			buttons: ['confirm'],
			language: {
				confirm: this.language.ok
			},
			content: [
				textOrElement
			],
			onOpen: this.onDialogOpen.bind(this),
			onClose: this.onDialogClose.bind(this)
		});
	},

	onRequest: function(){
		this.loader.fade(1);
	},
	onComplete: function(){
		//this.loader.fade(0);
	},
	onSuccess: function(){
		this.loader.fade(0);
	},
	onError: function(){
		this.loader.fade(0);
	},
	onFailure: function(){
		this.loader.fade(0);
	},
	onDialogOpen: function(){
		this.dialogOpen = true;
		this.onDialogOpenWhenUpload.apply(this);
	},
	onDialogClose: function(){
		this.dialogOpen = false;
		this.onDialogCloseWhenUpload.apply(this);
	},
	onDialogOpenWhenUpload: function(){},
	onDialogCloseWhenUpload: function(){},
	onDragComplete: Function.from(false)
});

FileManager.Request = new Class({
	Extends: Request.JSON,

	options:
	{
		secure:          true, // Isn't this true by default anyway in REQUEST.JSON?
		fmDisplayErrors: false // Automatically display errors - ** your onSuccess still gets called, just ignore if it's an error **
	},

	initialize: function(options, filebrowser){
		this.parent(options);

		if (filebrowser.options.propagateType == 'GET')
		{
			this.options.url += (this.options.url.indexOf('?') == -1 ? '?' : '&') + Object.toQueryString(filebrowser.options.propagateData);
		}
		else
		{
			this.options.data = Object.merge({}, filebrowser.options.propagateData, this.options.data);
		}

		if (this.options.fmDisplayErrors)
		{
			this.addEvents({
				success: function(j) {
					if (!j)        return filebrowser.showError();
					if (!j.status) return filebrowser.showError(j.error);
				},

				error: function(text, error) {
					filebrowser.showError(text);
				},

				failure: function(xmlHttpRequest) {
					var text = filebrowser.cvtXHRerror2msg(xmlHttpRequest);
					filebrowser.showError(text);
				}
			});
		}

		this.addEvents({
			request: filebrowser.onRequest.bind(filebrowser),
			complete: filebrowser.onComplete.bind(filebrowser),
			success: filebrowser.onSuccess.bind(filebrowser),
			error: filebrowser.onError.bind(filebrowser),
			failure: filebrowser.onFailure.bind(filebrowser)
		});
	}
});

FileManager.Language = {};

(function(){

// ->> load DEPENDENCIES
if (typeof __MFM_ASSETS_DIR__ == 'undefined')
{
	var __DIR__ = (function() {
			var scripts = document.getElementsByTagName('script');
			var script = scripts[scripts.length - 1].src;
			var host = window.location.href.replace(window.location.pathname+window.location.hash,'');
			return script.substring(0, script.lastIndexOf('/')).replace(host,'') + '/';
	})();
	__MFM_ASSETS_DIR__ = __DIR__ + "../Assets";
}
Asset.javascript(__MFM_ASSETS_DIR__+'/js/milkbox/milkbox.js');
Asset.css(__MFM_ASSETS_DIR__+'/js/milkbox/css/milkbox.css');
Asset.css(__MFM_ASSETS_DIR__+'/Css/FileManager.css');
Asset.css(__MFM_ASSETS_DIR__+'/Css/Additions.css');
Asset.javascript(__MFM_ASSETS_DIR__+'/js/jsGET.js', { events: {load: (function(){ window.fireEvent('jsGETloaded'); }).bind(this)}});

Element.implement({

	center: function(offsets) {
		var scroll = document.getScroll(),
			offset = document.getSize(),
			size = this.getSize(),
			values = {x: 'left', y: 'top'};

		if (!offsets) offsets = {};

		for (var z in values){
			var style = scroll[z] + (offset[z] - size[z]) / 2 + (offsets[z] || 0);
			this.setStyle(values[z], (z == 'y' && style < 30) ? 30 : style);
		}
		return this;
	}

});

FileManager.Dialog = new Class({

	Implements: [Options, Events],

	options: {
		/*
		 * onShow: function(){},
		 * onOpen: function(){},
		 * onConfirm: function(){},
		 * onDecline: function(){},
		 * onClose: function(){},
		 */
		request: null,
		buttons: ['confirm', 'decline'],
		language: {}
	},

	initialize: function(text, options){
		this.setOptions(options);
		this.dialogOpen = false;

		this.el = new Element('div', {
			'class': 'filemanager-dialog' + (Browser.ie ? ' filemanager-dialog-engine-trident' : '') + (Browser.ie ? ' filemanager-dialog-engine-trident' : '') + (Browser.ie8 ? '4' : '') + (Browser.ie9 ? '5' : ''),
			opacity: 0,
			tween: {duration: 250}
		}).adopt([
			typeOf(text) == 'string' ? new Element('div', {text: text}) : text
		]);

		if (typeof this.options.content != 'undefined') {
			this.options.content.each((function(content){
				if (content && typeOf(content) == 'element') this.el.getElement('div').adopt(content);
				else if (content) this.el.getElement('div').set('html',this.el.getElement('div').get('html')+'<br>'+content);
			}).bind(this));
		}

		Array.each(this.options.buttons, function(v){
			new Element('button', {'class': 'filemanager-dialog-' + v, text: this.options.language[v]}).addEvent('click', (function(e){
				if (e) e.stop();
				this.fireEvent(v).fireEvent('close');
				//if (!this.options.hideOverlay)
				this.overlay.hide();
				this.destroy();
			}).bind(this)).inject(this.el);
		}, this);

		this.overlay = new Overlay({
			'class': 'filemanager-overlay filemanager-overlay-dialog',
			events: {click: this.fireEvent.pass('close',this)},
			tween: {duration: 250}
		});

		this.bound = {
			scroll: (function(){
				if (!this.el)
					this.destroy();
				else
					this.el.center();
			}).bind(this),
			keyesc: (function(e){
				//if (typeof console !== 'undefined' && console.log) console.log('keyEsc: key press: ' + e.key);
				if (e.key == 'esc') {
					e.stopPropagation();
					this.fireEvent('close').destroy();
				}
			}).bind(this)
		};

		this.show();
	},

	show: function(){
		if (!this.options.hideOverlay)
			this.overlay.show();
		var self = this;
		this.fireEvent('open');
		this.el.setStyle('display', 'block').inject(document.body).center().fade(1).get('tween').chain(function(){
			var button = this.element.getElement('button.filemanager-dialog-confirm') || this.element.getElement('button');
			if (button) button.focus();
			self.fireEvent('show');
		});

		//if (typeof console !== 'undefined' && console.log) console.log('add key up(ESC)/resize/scroll on show 1500');
		document.addEvents({
			'scroll': this.bound.scroll,
			'resize': this.bound.scroll,
			'keyup': this.bound.keyesc
		});
	},

	destroy: function() {
		if (this.el) {
			this.el.fade(0).get('tween').chain((function(){
				if (!this.options.hideOverlay)
					this.overlay.destroy();
				this.el.destroy();
			}).bind(this));
		}
		//if (typeof console !== 'undefined' && console.log) console.log('remove key up(ESC) on destroy');
		document.removeEvent('scroll', this.bound.scroll).removeEvent('resize', this.bound.scroll).removeEvent('keyup', this.bound.keyesc);
	}

});

this.Overlay = new Class({

	initialize: function(options){
		this.el = new Element('div', Object.append({
			'class': 'filemanager-overlay'
		}, options)).inject(document.body);
	},

	show: function(){
		this.objects = $$('object, select, embed').filter(function(el){
			return el.id == 'SwiffFileManagerUpload' || el.style.visibility == 'hidden' ? false : !!(el.style.visibility = 'hidden');
		});

		this.resize = (function(){
			if (!this.el) this.destroy();
			else this.el.setStyles({
				width: document.getScrollWidth(),
				height: document.getScrollHeight()
			});
		}).bind(this);

		this.resize();

		this.el.setStyles({
			opacity: 0,
			display: 'block'
		}).get('tween').pause().start('opacity', 0.5);

		window.addEvent('resize', this.resize);

		return this;
	},

	hide: function(){
		if (!Browser.ie) {
			this.el.fade(0).get('tween').chain((function(){
				this.revertObjects();
				this.el.setStyle('display', 'none');
			}).bind(this));
		} else {
			this.revertObjects();
			this.el.setStyle('display', 'none');
		}

		window.removeEvent('resize', this.resize);

		return this;
	},

	destroy: function(){
		this.revertObjects().el.destroy();
	},

	revertObjects: function(){
		if (this.objects && this.objects.length) {
			this.objects.each(function(el){
				el.style.visibility = 'visible';
			});
		}

		return this;
	}

});

})();

