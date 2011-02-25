<?php

error_reporting(E_ALL);

include('../Assets/Connector/FileManager.php');

// Please add your own authentication here
function UploadIsAuthenticated($get){
  if(!empty($get['session'])) return true;
  
  return false;
}

$browser = new FileManager(array(
  'directory' => 'Files/',
  'thumbnailPath' => 'Files/Thumbnails/',
  'assetBasePath' => '../Assets',
  'chmod' => 0777
));

$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);