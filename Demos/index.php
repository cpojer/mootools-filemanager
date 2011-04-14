<?php

/*
As AJAX calls cannot set cookies, we set up the session for the authentication demonstration right here; that way, the session cookie
will travel with every request.
*/
if (!session_start()) die('session_start() failed');

/*
set a 'secret' value to doublecheck the legality of the session: did it originate from here?
*/
$_SESSION['FileManager'] = 'DemoMagick';

$_SESSION['UploadAuth'] = 'yes';

$params = session_get_cookie_params();

/* the remainder of the code does not need access to the session data. */
session_write_close();

// and add a couple other, slightly malicious cookies to check whether Flash will crash on it, or not.
setcookie("ASP.NET_SessionId", 'ASP.NET: b0rk b0rk b0rk & ... b0rk!', time() + 600,
	$params['path'], $params['domain'],
	$params['secure'], $params['httponly']
);
setcookie('.1!#$%20X', 'b0rk b0rk b0rk & ... b0rk!', time() + 600,
	$params['path'], $params['domain'],
	$params['secure'], $params['httponly']
);


?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>MooTools FileManager Testground</title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<link rel="shortcut icon" href="http://og5.net/christoph/favicon.png" />
	<style type="text/css">
	body {
		font-size: 11px;
		font-family: Tahoma, sans-serif;
	}

	h1 {
		margin: 0 0 10px 0;
		padding: 0;

		color: #666;
		font-weight: normal;
		font-size: 24px;
		letter-spacing: 1px;
		word-spacing: 2px;
		line-height: 22px;
		min-height: 25px;
	}

	h1 span {
		font-size: 11px;
		letter-spacing: 0;
		word-spacing: 0;
		text-shadow: none;
	}

	.blue { color: #1f52b0; }

	div.content {
		min-height: 200px;
		margin: 23px 34px;
		padding: 10px 17px;
		border: 1px solid #b2b2b2;
		background: #fff;
		box-shadow: rgba(0, 0, 0, 0.3) 0 0 10px;
		-moz-box-shadow: rgba(0, 0, 0, 0.3) 0 0 10px;
		-webkit-box-shadow: rgba(0, 0, 0, 0.3) 0 0 10px;
	}

	div.content div.example {
		float: left;
		clear: both;
		margin: 10px 0;
	}

	div.selected-file div {
		 padding: 3px;

		 line-height: 1.5em;
	}

	div.selected-file div img.preview {
		 padding: 3px;
	}

	button {
		margin: 5px 0;
	}
	</style>

	<script type="text/javascript" src="mootools-core.js"></script>
	<script type="text/javascript" src="mootools-more.js"></script>

	<script type="text/javascript" src="../Source/FileManager.js"></script>
	<script type="text/javascript" src="../Source/Gallery.js"></script>
	<script type="text/javascript" src="../Source/Uploader/Fx.ProgressBar.js"></script>
	<script type="text/javascript" src="../Source/Uploader/Swiff.Uploader.js"></script>
	<script type="text/javascript" src="../Source/Uploader.js"></script>
	<script type="text/javascript" src="../Language/Language.en.js"></script>
	<script type="text/javascript" src="../Language/Language.de.js"></script>
	<script type="text/javascript" src="dev_support.js"></script>

	<!-- extra, for viewing the gallery and selected picture: -->
	<script type="text/javascript" src="../Assets/js/milkbox/milkbox.js"></script>

	<script type="text/javascript">
		window.addEvent('domready', function() {

			/* Simple Example */
			var manager1 = new FileManager({
				url: 'manager.php',
				language: 'en',
				hideOnClick: true,
				assetBasePath: '../Assets',
				// uploadAuthData is deprecated; use propagateData instead. The session cookie(s) are passed through Flash automatically, these days...
				uploadAuthData: {
					session: 'MySessionData'
				},
				upload: true,
				download: true,
				destroy: true,
				rename: true,
				move_or_copy: true,
				createFolders: true,
				// selectable: true,
				hideQonDelete: false,     // DO ask 'are you sure' when the user hits the 'delete' button
				onComplete: function(path, file, mgr) {
					if (typeof console !== 'undefined' && console.log) console.log('MFM.onComplete: ' + path + ', ' + debug.dump(file) + ', ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
				},
				onModify: function(file, json, mode, mgr) {
					if (typeof console !== 'undefined' && console.log) console.log('MFM.onModify: ' + mode + ', ' + debug.dump(file) + ', ' + debug.dump(json) + ', ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
				},
				onShow: function(mgr) {
					if (typeof console !== 'undefined' && console.log) console.log('MFM.onShow: ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
				},
				onHide: function(mgr) {
					if (typeof console !== 'undefined' && console.log) console.log('MFM.onHide: ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
				},
				onScroll: function(e, mgr) {
					if (typeof console !== 'undefined' && console.log) console.log('MFM.onScroll: ' + debug.dump(e) + ', ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
				},
				onPreview: function(src, mgr, el) {
					if (typeof console !== 'undefined' && console.log) console.log('MFM.onPreview: ' + debug.dump(src) + ', ' + debug.dump(el) + ', ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
				},
				onDetails: function(json, mgr) {
					if (typeof console !== 'undefined' && console.log) console.log('MFM.onDetails: ' + debug.dump(json) + ', ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
				},
				onHidePreview: function(mgr) {
					if (typeof console !== 'undefined' && console.log) console.log('MFM.onHidePreview: ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
				},
				// and a couple of extra user defined parameters sent with EVERY request:
				propagateData: {
					origin: 'demo-FM-1'
				}
			});
			$('example1').addEvent('click', manager1.show.bind(manager1));

			/* Select a file */
			var el = $('example2');
			var div, manager2;
			var complete = function(path, file, mgr) {
				el.set('value', path);
				if (div) div.destroy();
				var icon = new Asset.image(
					mgr.assetBasePath+'Images/cancel.png',
					{
						'class': 'file-cancel',
						title: 'deselect'
					}).addEvent('click', function(e){
						e.stop();
						el.set('value', '');
						var self = this;
						div.fade(0).get('tween').chain(function(){
							div.destroy();
							mgr.tips.hide();
							mgr.tips.detach(self);
						});
					});
				mgr.tips.attach(icon);

				var img = null;
				var mimetype = file.mime;
				if (mimetype && mimetype.contains('image/'))
				{
					img = new Element('div', {
							'text': 'Click on the thumbnail to view the image/file in a lightbox (milkbox)'
						}).adopt(
							new Element('br'),
							new Element('a', {
									'data-milkbox': 'single',
									'title': file.name,
									'href': encodeURI(path)              // see also:  http://www.javascripter.net/faq/escape.htm
								}).adopt(new Element('img', {
									'src': (file.thumb250 ? file.thumb250 : file.icon),
									'class': 'preview',
									'alt': 'preview (picked)'
								}))
						);
				}

				div = new Element('div', {'class': 'selected-file', text: 'Selected file: '}).adopt(
					new Asset.image(file.icon, {'class': 'mime-icon'}),
					new Element('span', {text: file.name}),
					icon,
					img
				).inject(el, 'after');

				if (img && typeof milkbox != 'undefined')
				{
					milkbox.reloadPageGalleries();
				}
			};

			manager2 = new FileManager({
				url: 'selectImage.php',
				language: 'en',
				filter: 'image',
				hideOnClick: true,
				assetBasePath: '../Assets',
				// uploadAuthData is deprecated; use propagateData instead. The session cookie(s) are passed through Flash automatically, these days...
				uploadAuthData: {
					session: 'MySessionData'
				},
				selectable: true,
				upload: true,
				destroy: true,
				rename: true,
				move_or_copy: true,
				createFolders: true,
				onComplete: complete,
				// and a couple of extra user defined parameters sent with EVERY request:
				propagateData: {
					origin: 'demo-selectFile'
				}
			});

			el.setStyle('display', 'none');
			var val = el.get('value');
			if (val) {
				complete.apply(manager2, [val, {
					name: val.split('/').getLast(),
					icon: '../Assets/Images/Icons/'+val.split('.').getLast()+'.png'
				}, manager2]);
			}

			new Element('button', {'class': 'browser', text: 'Select an image'}).addEvent('click', manager2.show.bind(manager2)).inject(el, 'before');

			/* Localized Example */
			var manager3 = new FileManager({
				url: 'manager.php',
				language: 'de',
				hideOnClick: true,
				assetBasePath: '../Assets',
				// uploadAuthData is deprecated; use propagateData instead. The session cookie(s) are passed through Flash automatically, these days...
				uploadAuthData: {
					session: 'MySessionData'
				},
				upload: true,
				destroy: true,
				rename: true,
				move_or_copy: true,
				createFolders: true,
				// and a couple of extra user defined parameters sent with EVERY request:
				propagateData: {
					origin: 'demo-clickedLink'
				}
			});
			$('example3').addEvent('click', manager3.show.bind(manager3));


			/* Gallery Example */
			var global = this;
			var example4 = $('myGallery');
			var manager4 = new FileManager.Gallery({
				url: 'selectImage.php?exhibit=A', // 'manager.php', but with a bogus query parameter included: latest FM can cope with such an URI
				assetBasePath: '../Assets',
				filter: 'image',
				hideOnClick: true,
				// uploadAuthData is deprecated; use propagateData instead. The session cookie(s) are passed through Flash automatically, these days...
				uploadAuthData: {
					session: 'MySessionData'
				},
				propagateData: {
					origin: 'demo-Gallery'
				},
				onShow: function(mgr) {
					if (typeof console !== 'undefined' && console.log) console.log('GALLERY.onShow: ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));
					var obj;
					Function.attempt(function(){
						var gallist = example4.get('value');
						if (typeof console !== 'undefined' && console.log) console.log('GALLERY list: ' + debug.dump(gallist, 0, 1, 60, 'function'));
						obj = JSON.decode(gallist);
					});
					this.populate(obj);
				},
				onComplete: function(serialized, files, mgr){
					if (typeof console !== 'undefined' && console.log) console.log('GALLERY.onComplete: ' + debug.dump(serialized) + ', ' + debug.dump(files) + ', ' + debug.dump(mgr, 0, 1, 60, 'object,function,string:empty'));

					example4.set('value', JSON.encode(serialized));
				}
			});
			$('example4').addEvent('click', manager4.show.bind(manager4));
		});
	</script>
</head>
<body>
<div id="content" class="content">
	<h1>FileManager Demo</h1>
	<div class="example">
		<button id="example1" class="BrowseExample">Open File-Manager</button>
	</div>
	<div class="example">
		<input name="BrowseExample2" type="text" id="example2" value="Smile.gif" />
	</div>
	<div class="example">
		<a href="#" id="example3" class="BrowseExample">Open File-Manager from a link (German)</a>
	</div>

	<div class="example">
		<a href="tinymce.php">Open File-Manager from TinyMCE (editor) - separate test page</a>
	</div>

	<div class="example">
		<button id="example4">Create a Gallery</button>
		<input name="BrowseExample4" type="text" id="myGallery" value="Gallery output will be stored in here" style="width: 550px;" />
	</div>

	<div class="example">
		<a href="test-backend.php">Run tests on the backend of the File-Manager</a>
	</div>

	<div class="example">
		<a href="../Assets/js/demo.html">Run jsGET demo</a>
	</div>

	<div style="clear: both;"></div>

</div>
</body>
</html>