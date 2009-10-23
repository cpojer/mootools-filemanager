<?php

include('../Backend/FileManager.php');

// Please add your own authentication here
function UploadIsAuthenticated($get){
	if(!empty($get['session'])) return true;
	
	return false;
}

$browser = new FileManager(array(
	'directory' => 'Files/',
	'assetBasePath' => '../Assets',
	'upload' => false,
	'destroy' => false,
));

$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);