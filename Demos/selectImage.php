<?php

error_reporting(E_ALL | E_STRICT);

require_once('../Assets/Connector/FileManager.php');


define('DEVELOPMENT', 0);   // set to 01 / 1 to enable logging of each incoming event request.


// dumper useful in development
function FM_vardumper($mgr = null, $action = null, $info = null, $filenamebase = null)
{
	if (DEVELOPMENT)
	{
		if (!is_string($filenamebase))
		{
			$filenamebase = basename(__FILE__);
		}

		if ($mgr)
			$settings = $mgr->getSettings();
		else
			$settings = null;

		//$mimetdefs = $mgr->getMimeTypeDefinitions();

		// log request data:
		ob_start();
			echo "FileManager::action:\n";
			var_dump($action);
			echo "\n\nFileManager::info:\n";
			var_dump($info);
			echo "\n\nFileManager::settings:\n";
			var_dump($settings);

			if (0) // set to 'if (01)' if you want this bit dumped as well; fastest back-n-forth edit that way :-)
			{
				echo "\n\n_SERVER:\n";
				var_dump($_SERVER);
			}
			if (0)
			{
				echo "\n\n_ENV:\n";
				if (isset($_ENV)) var_dump($_ENV); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_GET:\n";
				if (isset($_GET)) var_dump($_GET); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_POST:\n";
				if (isset($_POST)) var_dump($_POST); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_REQUEST:\n";
				if (isset($_REQUEST)) var_dump($_REQUEST); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_FILES:\n";
				if (isset($_FILES)) var_dump($_FILES); else echo "(null)\n";
			}
			if (0)
			{
				echo "\n\n_COOKIES:\n";
				if (isset($_COOKIES)) var_dump($_COOKIES); else echo "(null)\n";
			}
			if (0)
			{
				echo "\n\n_SESSION:\n";
				if (isset($_SESSION)) var_dump($_SESSION); else echo "(null)\n";
			}
		$dump = ob_get_clean();
		static $count;
		if (!$count) $count = 1; else $count++;
		$dst = ((!empty($filenamebase) ? $filenamebase . '.' : '') . date('Ymd-His') . '.' . fmod(microtime(true), 1) . '-' . $action . '-' . $count . '.log');
		$dst = preg_replace('/[^A-Za-z0-9-_.]+/', '_', $dst);    // make suitable for filesystem
		@file_put_contents($dst, html_entity_decode(strip_tags($dump), ENT_NOQUOTES, 'UTF-8'));
	}
}




/*
 * FileManager event callback: Please add your own authentication / authorization here.
 *
 * Note that this function serves as a custom callback for all FileManager
 * authentication/authorization requests, but you may of course provide
 * different functions for each of the FM callbacks.
 *
 * Return TRUE when the session/client is authorizaed to execute the action, FALSE
 * otherwise.
 */
function FM_IsAuthorized($mgr, $action, $info)
{
	//$settings = $mgr->getSettings();
	//$mimetdefs = $mgr->getMimeTypeDefinitions();

	// log request data:
	FM_vardumper($mgr, $action, $info);


	/*
	 * authenticate / authorize:
	 * this sample is a bogus authorization, but you can perform simple to highly
	 * sophisticated authentications / authorizations here, e.g. even ones which also check permissions
	 * related to what is being uploaded right now (different permissions required for file mimetypes,
	 * e.g. images: any authorized user; while other file types which are more susceptible to carrying
	 * illicit payloads requiring at least 'power/trusted user' permissions, ...)
	 */

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
		 *         'dir' => $dir,
		 *         'file' => $path,
		 *         'name' => $name
		 *     );
		 */
		return true;

	case 'create': // create directory
		/*
		 *     $fileinfo = array(
		 *         'dir' => $dir,
		 *         'subdir' => $file,
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
	// fake a POST submit through a GET request so we can easily diag/debug event requests:
	if (!isset($_POST)) $_POST = array();
	foreach($_GET as $k => $v)
	{
		$_POST[$k] = $v;
	}
}


$browser = new FileManager(array(
	'directory' => 'Files/',                   // relative paths: are relative to the URI request script path, i.e. dirname(__FILE__)
	'thumbnailPath' => 'Files/Thumbnails/',
	'assetBasePath' => '../Assets',
	'chmod' => 0777,
	//'maxUploadSize' => 1024 * 1024 * 5,
	//'upload' => false,
	//'destroy' => false,
	//'create' => false,
	//'move' => false,
	//'download' => false,
	'filter' => 'image/',
	'UploadIsAuthorized_cb' => 'FM_IsAuthorized',
	'DownloadIsAuthorized_cb' => 'FM_IsAuthorized',
	'CreateIsAuthorized_cb' => 'FM_IsAuthorized',
	'DestroyIsAuthorized_cb' => 'FM_IsAuthorized',
	'MoveIsAuthorized_cb' => 'FM_IsAuthorized'
));




// log request data:
FM_vardumper($browser, 'init' . (!empty($_GET['event']) ? '-' . $_GET['event'] : null));




$browser->fireEvent(!empty($_GET['event']) ? $_GET['event'] : null);

