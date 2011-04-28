<?php

/*
As AJAX calls cannot set cookies, we set up the session for the authentication demonstration right here; that way, the session cookie
will travel with every request.
*/
session_name('alt_session_name');
if (!session_start()) die('session_start() failed');

/*
set a 'secret' value to doublecheck the legality of the session: did it originate from here?
*/
$_SESSION['FileManager'] = 'DemoMagick';

$_SESSION['UploadAuth'] = 'yes';

$params = session_get_cookie_params();

/* the remainder of the code does not need access to the session data. */
session_write_close();

if (0)
{
	// and add a couple other, slightly malicious cookies to check whether Flash will crash on it, or not.
	setcookie("ASP.NET_SessionId", 'ASP.NET: b0rk b0rk b0rk & ... b0rk!', time() + 600,
		$params['path'], $params['domain'],
		$params['secure'], $params['httponly']
	);
	setcookie('.1!#$%20X', 'b0rk b0rk b0rk & ... b0rk!', time() + 600,
		$params['path'], $params['domain'],
		$params['secure'], $params['httponly']
	);
}

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>MooTools FileManager Testground</title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<link rel="shortcut icon" href="http://og5.net/christoph/favicon.png" />
	<link rel="stylesheet" href="demos.css" type="text/css" />

	<script type="text/javascript" src="../../../../../lib/includes/js/mootools-core.js"></script>
	<script type="text/javascript" src="../../../../../lib/includes/js/mootools-more.js"></script>

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
				propagateData: {
					extra_data: 'ExtraData'
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

		});
	</script>
</head>
<body>
<div id="content" class="content">
	<h1>Basic FileManager Demo</h1>
	<div class="example">
		<button id="example1" class="BrowseExample">Open File-Manager</button>
	</div>

	<div class="example">
		<a href="multiple-demos.php">Try more demos: selecting an image, creating a gallery, translated interface (i18n support)</a>
	</div>

	<div class="example">
		<a href="gallery-demo.php">Try the gallery mode demo</a>
	</div>

	<div class="example">
		<a href="test-backend.php">Run tests on the backend of the File-Manager</a>
	</div>

	<div class="example">
		<a href="../Assets/js/demo.html">Run jsGET demo</a>
	</div>

	<div class="example">
		<a href="video-embedding.html">Test video and audio embedding</a>
	</div>

	<div style="clear: both;"></div>

</div>
</body>
</html>