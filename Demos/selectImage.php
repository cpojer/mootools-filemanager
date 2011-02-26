<?php

include('../Assets/Connector/FileManager.php');

$browser = new FileManager(array(
  'directory' => 'Files/',
  'thumbnailPath' => 'Files/Thumbnails/',
  'assetBasePath' => '../Assets',
  'chmod' => 0777
));

$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);