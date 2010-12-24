<?php

include('../Backend/FileManager.php');

$browser = new FileManager(array(
	'directory' => '/_feindura/_upload/',
	'assetBasePath' => '../Assets',
	'upload' => false,
	'destroy' => false,
	'filter' => 'image/',
));

$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);