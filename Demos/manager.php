<?php

error_reporting(E_ALL | E_STRICT);

require_once('../Assets/Connector/FileManager.php');


// FileManager event callback: Please add your own authentication here
function FM_IsAuthenticated($mgr, $action, $info)
{
	$settings = $mgr->getSettings();
	//$mimetdefs = $mgr->getMimeTypeDefinitions();

	// log request data:
	ob_start();
		echo "FileManager::action:\n";
		var_dump($action);
		echo "\n\nFileManager::info:\n";
		var_dump($info);
		echo "\n\nFileManager::settings:\n";
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

	switch ($action)
	{
	case 'upload':
		/*
		 *   $fileinfo = array(
		 *     'dir' => $dir,
		 *     'name' => $name,
		 *     'extension' => $this->options['safe'] && $name && in_array(strtolower(pathinfo($_FILES['Filedata']['name'], PATHINFO_EXTENSION)), array('exe', 'dll', 'php', 'php3', 'php4', 'php5', 'phps')) ? 'txt' : null,
		 *     'size' => $this->options['maxUploadSize'],
		 *     'mimes' => $this->getAllowedMimeTypes(),
		 *     'chmod' => $this->options['chmod']
		 *   );
		 */
		if(!empty($_GET['session'])) return true;

		return false;

	case 'download':
		/*
		 *     $fileinfo = array(
		 *         'file' => $path,
		 *         'name' => $name
		 *     );
		 */
		return true;

	case 'create': // create directory
		/*
		 *     $fileinfo = array(
		 *         'dir' => $dir,
		 *         'file' => $file,
		 *         'name' => $name,
		 *         'chmod' => $this->options['chmod']
		 *     );
		 */
		return true;

	case 'destroy':
		/*
		 *     $fileinfo = array(
		 *         'dir' => $dir,
		 *         'file' => $file,
		 *         'name' => $name
		 *     );
		 */
		return true;

	case 'move':  // move or copy!
		/*
		 *     $fileinfo = array(
		 *         'dir' => $dir,
		 *         'file' => $file,
		 *         'name' => $name,
		 *         'newdir' => (!empty($this->post['newDirectory']) ? $this->post['newDirectory'] : '(null)'),
		 *         'newname' => (!empty($this->post['name']) ? $this->post['name'] : '(null)'),
		 *         'rename' => $rename,
		 *         'is_dir' => $is_dir,
		 *         'function' => $fn
		 *     );
		 */
		return true;

	default:
		return false;
	  }
}


if (01) // debugging
{
	if (0)
	{
		echo "<pre>\n";
		echo "pagetitle test = \n";
		$test = array(
			'~!@#$%^&*()_+',
			'`1234567890-=',
			'QWERTYUIOP{}',
			'qwertyuiop[]',
			'ASDFGHJKL:"',
			'asdfghjkl;\'',
			'ZXCVBNM<>?  ',
			'zxcvbnm,./  '
			);
		foreach ($test as $t)
		{
			//$r = FileManagerUtility::pagetitle($t);
			$r = preg_replace('/([^A-Za-z0-9. \[\]\(\)~&!@#_-])/', '_', $t);

			echo "\nORIG: [" . htmlentities($t) . "]\nRES:  [" . htmlentities($r) . "]\n";
		}
		$test = array(
			'.ignore',
			'___ignore',
			'_._.ignore',
			'._._ignore',
			'X.ignore',
			'X___ignore',
			'X_._.ignore',
			'X._._ignore',
			'__X_ignore',
			'_._X.ignore',
			'._.X_ignore'
			);
		foreach ($test as $t)
		{
			$r = trim($t, '_.');

			echo "\nORIG: [" . htmlentities($t) . "]\nRES:  [" . htmlentities($r) . "]\n";
		}
	}
	
	if (!isset($_POST)) $_POST = array();
	foreach($_GET as $k => $v)
	{
		$_POST[$k] = $v;
	}
}


$browser = new FileManager(array(
	'directory' => 'Files/',
	'thumbnailPath' => 'Files/Thumbnails/',
	'assetBasePath' => '../Assets',
	'chmod' => 0777,
	//'maxUploadSize' => 1024 * 1024 * 5,
	//'upload' => false,
	//'destroy' => false,
	//'filter' => 'image/',
	'UploadIsAuthenticated_cb' => 'FM_IsAuthenticated',
	'DownloadIsAuthenticated_cb' => 'FM_IsAuthenticated',
	'CreateIsAuthenticated_cb' => 'FM_IsAuthenticated',
	'DestroyIsAuthenticated_cb' => 'FM_IsAuthenticated',
	'MoveIsAuthenticated_cb' => 'FM_IsAuthenticated'
));




	// log request data:
	ob_start();
		echo "\n\nFileManager::settings:\n";
		var_dump($browser->getSettings());

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
	file_put_contents('request.' . date('YmdHis') . (isset($_FILES) ? '-' . md5(json_encode($_FILES)) : '') . '.log', html_entity_decode(strip_tags($dump), ENT_NOQUOTES, 'UTF-8'));



$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);
?>