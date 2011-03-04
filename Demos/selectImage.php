<?php

error_reporting(E_ALL | E_STRICT);

include('../Assets/Connector/FileManager.php');

// Please add your own authentication here (in case of upload enabled)
function UploadIsAuthenticated($mgr)
{
	$settings = $mgr->getSettings();
	//$mimetdefs = $mgr->getMimeTypeDefinitions();

	// log request data:
	ob_start();
		echo "FileManager::settings:\n";
		var_dump($settings);
		
		echo "\n\n_SERVER:\n";
		var_dump($_SERVER);
		echo "\n\n_ENV:\n";
		if (isset($_ENV)) var_dump($_ENV); else echo "(null)\n";
		echo "\n\n_GET:\n";
		if (isset($_GET)) var_dump($_GET); else echo "(null)\n";
		echo "\n\n_POST:\n";
		if (isset($_POST)) var_dump($_POST); else echo "(null)\n";
		echo "\n\n_REQUEST:\n";
		if (isset($_REQUEST)) var_dump($_REQUEST); else echo "(null)\n";
		echo "\n\n_FILES:\n";
		if (isset($_FILES)) var_dump($_FILES); else echo "(null)\n";
		echo "\n\n_COOKIES:\n";
		if (isset($_COOKIES)) var_dump($_COOKIES); else echo "(null)\n";
		echo "\n\n_SESSION:\n";
		if (isset($_SESSION)) var_dump($_SESSION); else echo "(null)\n";
	$dump = ob_get_clean();
	// MD5(json_encode(...)) is just a way to generate different filenames for different input which happen within the same second:
	file_put_contents('selectImage.' . date('YmdHis') . (isset($_FILES) ? '-' . md5(json_encode($_FILES)) : '') . '.log', html_entity_decode(strip_tags($dump), ENT_NOQUOTES, 'UTF-8'));
	

  // authenticate: this sample is a bogus authentication, but you can perform simple to highly
  // sophisticated authentications here, e.g. even authentications which also check permissions
  // related to what is being uploaded right now (different permissions required for file mimetypes,
  // e.g. images:any authenticated user; other file types which are more susceptible to carrying 
  // illicit payloads requiring at least 'power/trusted user' permissions, ...)
  
  if(!empty($_GET['session'])) return true;
  
  return false;
}


$browser = new FileManager(array(
  'directory' => 'Files/',
  'thumbnailPath' => 'Files/Thumbnails/',
  'assetBasePath' => '../Assets',
  'chmod' => 0777
));

$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);