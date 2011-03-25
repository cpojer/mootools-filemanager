<?php

error_reporting(E_ALL | E_STRICT);

define("COMPACTCMS_CODE", true);
define("FILEMANAGER_CODE", true);


define('DEVELOPMENT', 0);   // set to 01 / 1 / nonzero value to enable logging of each incoming event request.


require_once('FM-common.php');  // this one loads the appropriate FileManager AND the support functions used in this demo




/*
when you want to pass absolute paths into FileManager, be reminded that ALL paths
(except for the [mimeTypesPath] one!) are paths in URI space, i.e. the 'root'
is assumed to be DocumentRoot.

Below is a quick example how a physical filesystem path /could/ be transformed
to a URI path -- assumed you don't get buggered by having Aliases apply to this
particular path, in which case you are between a rock and a hard place: then you
MUST specify URI paths instead, this 'trick' being defective.
*/

$fm_basedir = str_replace(str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']), '', dirname(str_replace('\\', '/', __FILE__))) . '/';



/*
Go to FM-common.php to edit the Alias array there to mirror your local situation.

See also the 'SITE_USES_ALIASES' define and the mkNewFileManager() function in there.

mkNewFileManager() is just a wrapper used to keep the demo code lean...
*/
$browser = mkNewFileManager(array(
	//'directory' => $fm_basedir . 'Files/',   // absolute paths: as the relative ones, they sit in URI space, i.e. assume DocumentRoot is root '/'

	'directory' => 'Files/',                   // relative paths: are relative to the URI request script path, i.e. dirname(__FILE__) or rather: $_SERVER['SCRIPT_NAME']

	//'filter' => 'image/',
	//'allowExtChange' => false                 // allow file name extensions to be changed; the default however is: NO (FALSE)
));



$event_cmd = (!empty($_GET['event']) ? $_GET['event'] : null);

// log request data:
FM_vardumper($browser, 'init' . $event_cmd);



// and process the request:
$browser->fireEvent($event_cmd);

