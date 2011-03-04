<?php

error_reporting(E_ALL | E_STRICT);

include('../Assets/Connector/FileManager.php');

$browser = new FileManager(array(
  'directory' => 'Files/',
  'thumbnailPath' => 'Files/Thumbnails/',
  'assetBasePath' => '../Assets',
  'chmod' => 0777
));

$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);