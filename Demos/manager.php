<?php

include('../Backend/FileManager.php');

// Please add your own authentication here
function UploadIsAuthenticated($get){
	if(!empty($get['session'])) return true;
	
	return false;
}

$browser = new FileManager(array(
	'directory' => 'Files/',
	'imageBasePath' => '../Images',
	'dateformat' => 'd.m.y - h:i',
	'filter' => 'image/',
));

$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);