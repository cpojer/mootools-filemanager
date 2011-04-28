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

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>MooTools FileManager Testground</title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
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

			// 
			if (0)
			{
				// override mootools global default setting for fade effects:
				Fx.prototype.options.fps = 10;
				//Fx.prototype.options.unit = false;
				Fx.prototype.options.duration = 5;
				//Fx.prototype.options.frames = 1000;
				//Fx.prototype.options.frameSkip = true;
				//Fx.prototype.options.link = 'ignore';
				//Fx.prototype.frameInterval;
				Fx.Durations['short'] = 5;
				Fx.Durations['normal'] = 5;
				Fx.Durations['long'] = 5;
			}
			

			/* Gallery Example */
			var global = this;
			var example4 = $('myGallery');
			var gallery_json = {
				"/rant_yellow.gif":"",
				"/towers 46p 1v/00005.jpg":"texan hat #0005",
				"/items with issues/20091103114923_untitled-8.jpg":"mosquito on blue",
				"/items with issues/atomic-bomb-explosion [DesktopNexus.com].jpg":"",
				"/items with issues/en porte-jarretelles - nukes EXIF dump in backend.jpg":"",
				"/items with issues/Konachan_com_67642_long_hair_ribbons_suzumiya_haruhi_suzumiya_ha_1.png":"",
				"/items with issues/manager-9.php.jpg":"",
				"/items with issues/fixme_gap_yuu_plasm.png":""
			};
			
			example4.set('value', JSON.encode(gallery_json));

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
	<div class="go_home">
	<a href="index.php" title="Go to the Demo index page"><img src="home_16x16.png"> </a>
	</div>

	<h1>FileManager Demo</h1>
	
	<div class="example">
		<button id="example4">Create a Gallery</button>
		<input name="BrowseExample4" type="text" id="myGallery" value="Gallery output will be stored in here" style="width: 550px;" />
	</div>

	<div style="clear: both;"></div>

</div>
</body>
</html>