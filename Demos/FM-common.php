<?php

if (!defined('FILEMANAGER_CODE')) { header('HTTP/1.0 403 Forbidden', true, 403); die('illegal entry point'); }


/*
 * Set to nonzero, e.g. 01, when your site uses mod_alias, mod_vhost_alias or any other form of path aliasing, where
 * one or more of these assumptions do not apply any longer as they would for a 'regular' site:
 *
 * - SERVER['DOCUMENT_ROOT'] correctly points at the physical filesystem path equivalent of the '/' URI path (~ 'http://your-site.com/')
 *
 * - every subdirectory of SERVER['DOCUMENT_ROOT'] is also a subdirectory in URI space, i.e. URI path '/media/Files/'
 *   (~ 'http://your-site.com/media/Files/') would point at the physical filesystem path SERVER['DOCUMENT_ROOT'].'/media/Files/'
 *
 * Edit the 'Aliases' sub-array below to mimic your local site setup; see the notes there for a few hints.
 */
define('SITE_USES_ALIASES', 01);

define('DEVELOPMENT', 0);   // set to 01 / 1 / nonzero value to enable logging of each incoming event request.


if (!SITE_USES_ALIASES)
{
	require_once('../Assets/Connector/FileManager.php');
}
else
{
	// you don't need the additional sophistication of this one when you don't need path mapping support
	require_once('../Assets/Connector/FMgr4Alias.php');
}









/**
defines for dump_request_to_logfile():
*/
define('DUMP2LOG_SERVER_GLOBALS',  0x0001);
define('DUMP2LOG_ENV_GLOBALS',     0x0002);
define('DUMP2LOG_SESSION_GLOBALS', 0x0004);
define('DUMP2LOG_POST_GLOBALS',    0x0008);
define('DUMP2LOG_GET_GLOBALS',     0x0010);
define('DUMP2LOG_REQUEST_GLOBALS', 0x0020);
define('DUMP2LOG_FILES_GLOBALS',   0x0040);
define('DUMP2LOG_COOKIE_GLOBALS',  0x0080);
define('DUMP2LOG_STACKTRACE',      0x0400);

define('DUMP2LOG_SORT',                            0x0100000);
define('DUMP2LOG_FORMAT_AS_HTML',                  0x0400000);
define('DUMP2LOG_WRITE_TO_FILE',                   0x0800000);
define('DUMP2LOG_WRITE_TO_STDOUT',                 0x1000000);











/*
Derived from code by phella.net:

  http://nl3.php.net/manual/en/function.var-dump.php
*/
function var_dump_ex($value, $level = 0, $sort_before_dump = 0)
{
	if ($level == -1)
	{
		$trans = array();
		if ($show_whitespace)
		{
			$trans[' '] = '&there4;';
			$trans["\t"] = '&rArr;';
			$trans["\n"] = '&para;';
			$trans["\r"] = '&lArr;';
			$trans["\0"] = '&oplus;';
		}
		return strtr(htmlspecialchars($value, ENT_COMPAT, 'UTF-8'), $trans);
	}

	$rv = '';
	if ($level == 0)
	{
		$rv .= '<pre>';
	}
	$type = gettype($value);
	$rv .= $type;

	switch ($type)
	{
	case 'string':
		$rv .= '(' . strlen($value) . ')';
		$value = var_dump_ex($value, -1);
		break;

	case 'boolean':
		$value = ($value ? 'true' : 'false');
		break;

	case 'object':
		$props = get_class_vars(get_class($value));
		if ($sort_before_dump > $level)
		{
			ksort($props);
		}
		$rv .= '(' . count($props) . ') <u>' . get_class($value) . '</u>';
		foreach($props as $key => $val)
		{
			$rv .= "\n" . str_repeat("\t", $level + 1) . var_dump_ex($key, -1) . ' => ';
			$rv .= var_dump_ex($value->{$key}, $level + 1, $sort_before_dump, $show_whitespace);
		}
		$value = '';
		break;

	case 'array':
		if ($sort_before_dump > $level)
		{
			$value = array_merge($value); // fastest way to clone the input array
			ksort($value);
		}
		$rv .= '(' . count($value) . ')';
		foreach($value as $key => $val)
		{
			$rv .= "\n" . str_repeat("\t", $level + 1) . var_dump_ex($key, -1) . ' => ';
			$rv .= var_dump_ex($val, $level + 1, $sort_before_dump, $show_whitespace);
		}
		$value = '';
		break;

	default:
		break;
	}
	$rv .= ' <b>' . $value . '</b>';
	if ($level == 0)
	{
		$rv .= '</pre>';
	}
	return $rv;
}




/**
 * Generate a dump of the optional $extra values and/or the global variables $ccms[], $cfg[] and the superglobals.
 *
 * @param array $filename_options (optional) specifies a few pieces of the filename which will be generated to write
 *                                the dump to:
 *
 *                                'namebase': the leading part of the filename,
 *                                'origin-section': follows the timestamp encoded in the filename,
 *                                'extension': the desired filename extension (default: 'html' for HTML dumps, 'log' for plain dumps)
 *
 * @return the generated dump in the format and carrying the content as specified by the $dump_options.
 */
define('__DUMP2LOG_DEFAULT_OPTIONS', -1 ^ DUMP2LOG_WRITE_TO_STDOUT);
function dump_request_to_logfile($extra = null, $dump_options = __DUMP2LOG_DEFAULT_OPTIONS, $filename_options = null)
{
	global $_SERVER;
	global $_ENV;
	global $_COOKIE;
	global $_SESSION;
	static $sequence_number;

	if (!$sequence_number)
	{
		$sequence_number = 1;
	}
	else
	{
		$sequence_number++;
	}

	$sorting = ($dump_options & DUMP2LOG_SORT);
	$show_WS = ($dump_options & DUMP2LOG_FORMAT_AS_HTML);

	$rv = '<html><body>';

	if (!empty($_SESSION['dbg_last_dump']) && ($dump_options & DUMP2LOG_FORMAT_AS_HTML))
	{
		$rv .= '<p><a href="' . $_SESSION['dbg_last_dump'] . '">Go to previous dump</a></p>' ."\n";
	}

	if (!empty($extra))
	{
		$rv .= '<h1>EXTRA</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($extra, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}

	if ($dump_options & DUMP2LOG_ENV_GLOBALS)
	{
		$rv .= '<h1>$_ENV</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($_ENV, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}
	if ($dump_options & DUMP2LOG_SESSION_GLOBALS)
	{
		$rv .= '<h1>$_SESSION</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($_SESSION, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}
	if ($dump_options & DUMP2LOG_POST_GLOBALS)
	{
		$rv .= '<h1>$_POST</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($_POST, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}
	if ($dump_options & DUMP2LOG_GET_GLOBALS)
	{
		$rv .= '<h1>$_GET</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($_GET, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}
	if ($dump_options & DUMP2LOG_FILES_GLOBALS)
	{
		$rv .= '<h1>$_FILES</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($_FILES, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}
	if ($dump_options & DUMP2LOG_COOKIE_GLOBALS)
	{
		$rv .= '<h1>$_COOKIE</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($_COOKIE, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}
	if ($dump_options & DUMP2LOG_REQUEST_GLOBALS)
	{
		$rv .= '<h1>$_REQUEST</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($_REQUEST, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}

	if ($dump_options & DUMP2LOG_SERVER_GLOBALS)
	{
		$rv .= '<h1>$_SERVER</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($_SERVER, 0, $sorting, $show_WS);
		$rv .= "</pre>";
	}

	if ($dump_options & DUMP2LOG_STACKTRACE)
	{
		$st = debug_backtrace(false);
		$rv .= '<h1>Stack Trace:</h1>';
		$rv .= "<pre>";
		$rv .= var_dump_ex($st, 0, 0, $show_WS);
		$rv .= "</pre>";
	}

	$rv .= '</body></html>';

	$tstamp = date('Y-m-d.His') . '.' . sprintf('%07d', fmod(microtime(true), 1) * 1E6);

	$filename_options = array_merge(array(
			'namebase'       => 'LOG-',
			'origin-section' => substr($_SERVER['REQUEST_URI'], 0, -42),
			'extension'      => (($dump_options & DUMP2LOG_FORMAT_AS_HTML) ? 'html' : 'log')
		), (is_array($filename_options) ? $filename_options : array()));

	$fname = $filename_options['namebase'] . $tstamp . '.' . sprintf('%03u', $sequence_number) . '-' . $filename_options['origin-section'] . '.' . $filename_options['extension'];
	$fname = preg_replace('/[^A-Za-z0-9_.-]+/', '_', $fname);    // make suitable for filesystem
	if (isset($_SESSION))
	{
		$_SESSION['dbg_last_dump'] = $fname;
	}

	if (!($dump_options & DUMP2LOG_FORMAT_AS_HTML))
	{
		$rv = preg_replace('/^.*?<body>(.+)<\/body>.*?$/sD', '\\1', $rv);

		$trans['<h1>'] = "\n\n*** ";
		$trans['</h1>'] = " ***\n";
		$rv = strtr($rv, $trans);

		$rv = html_entity_decode(strip_tags($rv), ENT_NOQUOTES, 'UTF-8');
	}

	if ($dump_options & DUMP2LOG_WRITE_TO_FILE)
	{
		$fname = BASE_PATH . '/lib/includes/cache/' . $fname;

		@file_put_contents($fname, $rv);
	}

	if ($dump_options & DUMP2LOG_FORMAT_AS_HTML)
	{
		$rv = preg_replace('/^.*?<body>(.+)<\/body>.*?$/sD', '\\1', $rv);
	}

	if ($dump_options & DUMP2LOG_WRITE_TO_STDOUT)
	{
		echo $rv;
	}

	return array('filename' => $fname, 'content' => $rv);
}















/**
 * dumper useful in development
 */
function FM_vardumper($mgr = null, $action = null, $info = null, $extra = null)
{
	if (DEVELOPMENT)
	{
		if ($mgr)
			$settings = $mgr->getSettings();
		else
			$settings = null;

		//$mimetdefs = $mgr->getMimeTypeDefinitions();

		// log request data:
		$data = array(
				"FileManager::action" => $action,
				"FileManager::info" => $info,
				"FileManager::settings" => $settings
			);
		if (!empty($extra))
		{
			$data['extra'] = $extra;
		}

		dump_request_to_logfile($data, (0
				| DUMP2LOG_SERVER_GLOBALS
				| DUMP2LOG_ENV_GLOBALS
				| DUMP2LOG_SESSION_GLOBALS
				| DUMP2LOG_POST_GLOBALS
				| DUMP2LOG_GET_GLOBALS
				| DUMP2LOG_REQUEST_GLOBALS
				| DUMP2LOG_FILES_GLOBALS
				| DUMP2LOG_COOKIE_GLOBALS
				| DUMP2LOG_STACKTRACE
				| DUMP2LOG_SORT
				//| DUMP2LOG_FORMAT_AS_HTML
				| DUMP2LOG_WRITE_TO_FILE
				//| DUMP2LOG_WRITE_TO_STDOUT
			), array(
				'origin-section' => basename($_SERVER['REQUEST_URI']) . '-' . $action
			));
	}
}















/**
 * Just a simple wrapper around the FileManager class constructor. Assumes a series of option defaults for the Demos,
 * which you may override by providing your own in $options.
 *
 * Returns an instantiated FileManager instance, which you can use to process the incoming request.
 */
function mkNewFileManager($options = null)
{
	$Aliases = array();

	if (SITE_USES_ALIASES)
	{
		//
		// http://httpd.apache.org/docs/2.2/mod/mod_alias.html -- we emulate the Alias statement. Sort of.
		//
		// In principle each entry in this array should copy a Alias/VhostAlias/... web server configuration line.
		//
		// When filesystem paths are 'real time constructed', e.g. through complex regex manipulations, you will need
		// to derive your own class from FileManagerWithAliasSupport or FileManager and implement/override
		// the offending member functions in there, using the FileManagerWithAliasSupport implementation as a guide.
		//
		// NOTE that the above caveat applies to very complex rigs only, e.g. where a single URL points at different
		//      physical locations, depending on who's logged in, or where the request is originating from.
		//
		//      As long as you can construct a static URI path to disk mapping, you are good to go using the Aliases[]
		//      array below!
		//
		$Aliases = array(
				'/c/lib/includes/js/mootools-filemanager/Demos/Files/alias' => "D:/xxx",
				'/c/lib/includes/js/mootools-filemanager/Demos/Files/d' => "D:/xxx.tobesorted",
				'/c/lib/includes/js/mootools-filemanager/Demos/Files/u' => "D:/websites-uploadarea",

				'/c/lib/includes/js/mootools-filemanager/Demos/Files' => "D:/experiment"
			);
	}

	$options = array_merge(array(
			//'directory' => $fm_basedir . 'Files/',   // absolute paths: as the relative ones, they sit in URI space, i.e. assume DocumentRoot is root '/'

			'directory' => 'Files/',                   // relative paths: are relative to the URI request script path, i.e. dirname(__FILE__) or rather: $_SERVER['SCRIPT_NAME']
			'thumbnailPath' => 'Files/Thumbnails/',
			'assetBasePath' => '../Assets',
			'chmod' => 0777,
			//'maxUploadSize' => 1024 * 1024 * 5,
			//'upload' => false,
			//'destroy' => false,
			//'create' => false,
			//'move' => false,
			//'download' => false,
			//'filter' => 'image/',
			'allowExtChange' => true,                  // allow file name extensions to be changed; the default however is: NO (FALSE)
			'UploadIsAuthorized_cb' => 'FM_IsAuthorized',
			'DownloadIsAuthorized_cb' => 'FM_IsAuthorized',
			'CreateIsAuthorized_cb' => 'FM_IsAuthorized',
			'DestroyIsAuthorized_cb' => 'FM_IsAuthorized',
			'MoveIsAuthorized_cb' => 'FM_IsAuthorized',
			'ViewIsAuthorized_cb' => 'FM_IsAuthorized',
			'DetailIsAuthorized_cb' => 'FM_IsAuthorized',
			'ThumbnailIsAuthorized_cb' => 'FM_IsAuthorized',

			'Aliases' => $Aliases
		), (is_array($options) ? $options : array()));

	if (SITE_USES_ALIASES)
	{
		$browser = new FileManagerWithAliasSupport($options);
	}
	else
	{
		$browser = new FileManager($options);
	}
	return $browser;
}














/*
 * FileManager event callback: Please add your own authentication / authorization here.
 *
 * Note that this function serves as a custom callback for all FileManager
 * authentication/authorization requests, but you may of course provide
 * different functions for each of the FM callbacks.
 *
 * Return TRUE when the session/client is authorized to execute the action, FALSE
 * otherwise.
 *
 * NOTE: the customer code in here may edit the $fileinfo items and have those edits picked up by FM.
 *       E.g. changing the filename on write/move, fixing filename extensions based on file content sniffed mimetype, etc.
 */
function FM_IsAuthorized($mgr, $action, &$info)
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
		 *   $info[] contains:
		 *
		 *       'legal_url'             (string) LEGAL URI path to the directory where the file is being uploaded. You may invoke
		 *                                   $dir = $mgr->legal_url_path2file_path($legal_url);
		 *                               to obtain the physical filesystem path (also available in the 'dir' $info entry, by the way!), or
		 *                                   $url = $mgr->legal2abs_url_path($legal_url);
		 *                               to obtain the absolute URI path for the given directory.
		 *
		 *       'dir'                   (string) physical filesystem path to the directory where the file is being uploaded.
		 *
		 *       'raw_filename'          (string) the raw, unprocessed filename of the file being being uploaded, as specified by the client.
		 *
		 *                               WARNING: 'raw_filename' may contain anything illegal, such as directory paths instead of just a filename,
		 *                                        filesystem-illegal characters and what-not. Use 'name'+'extension' instead if you want to know
		 *                                        where the upload will end up.
		 *
		 *       'name'                  (string) the filename, sans extension, of the file being uploaded; this filename is ensured
		 *                               to be both filesystem-legal, unique and not yet existing in the given directory.
		 *
		 *       'extension'             (string) the filename extension of the file being uploaded; this extension is ensured
		 *                               to be filesystem-legal.
		 *
		 *                               Note that the file name extension has already been cleaned, including 'safe' mode processing,
		 *                               i.e. any uploaded binary executable will have been assigned the extension '.txt' already, when
		 *                               FileManager's options['safe'] is enabled.
		 *
		 *       'tmp_filepath'          (string) filesystem path pointing at the temporary storage location of the uploaded file: you can
		 *                               access the file data available here to optionally validate the uploaded content.
		 *
		 *       'mime'                  (string) the mime type as sniffed from the file
		 *
		 *       'mime_filter'           (optional, string) mime filter as specified by the client: a comma-separated string containing
		 *                               full or partial mime types, where a 'partial' mime types is the part of a mime type before
		 *                               and including the slash, e.g. 'image/'
		 *
		 *       'mime_filters'          (optional, array of strings) the set of allowed mime types, derived from the 'mime_filter' setting.
		 *
		 *       'size'                  (integer) number of bytes of the uploaded file
		 *
		 *       'maxsize'               (integer) the configured maximum number of bytes for any single upload
		 *
		 *       'overwrite'             (boolean) FALSE: the uploaded file will not overwrite any existing file, it will fail instead.
		 *
		 *                               Set to TRUE (and adjust the 'name' and 'extension' entries as you desire) when you wish to overwrite
		 *                               an existing file.
		 *
		 *       'chmod'                 (integer) UNIX access rights (default: 0666) for the file-to-be-created (RW for user,group,world).
		 *
		 *                               Note that the eXecutable bits have already been stripped before the callback was invoked.
		 *
		 *
		 * Note that this request originates from a Macromedia Flash client: hence you'll need to use the
		 * $_GET[session_name()] value to manually set the PHP session_id() before you start your your session
		 * again.
		 *
		 * The frontend-specified options.uploadAuthData items will be available as further $_GET[] items, as well.
		 */
		if(!empty($_GET[session_name()])) return true;

		return false;

	case 'download':
		/*
		 *   $info[] contains:
		 *
		 *       'legal_url'             (string) LEGAL URI path to the file to be downloaded. You may invoke
		 *                                   $dir = $mgr->legal_url_path2file_path($legal_url);
		 *                               to obtain the physical filesystem path (also available in the 'file' $info entry, by the way!), or
		 *                                   $url = $mgr->legal2abs_url_path($legal_url);
		 *                               to obtain the absolute URI path for the given file.
		 *
		 *       'file'                  (string) physical filesystem path to the file being downloaded.
		 *
		 *       'mime'                  (string) the mime type as sniffed from the file
		 *
		 *       'mime_filter'           (optional, string) mime filter as specified by the client: a comma-separated string containing
		 *                               full or partial mime types, where a 'partial' mime types is the part of a mime type before
		 *                               and including the slash, e.g. 'image/'
		 *
		 *       'mime_filters'          (optional, array of strings) the set of allowed mime types, derived from the 'mime_filter' setting.
		 */
		return true;

	case 'create': // create directory
		/*
		 *   $info[] contains:
		 *
		 *       'legal_url'             (string) LEGAL URI path to the parent directory of the directory being created. You may invoke
		 *                                   $dir = $mgr->legal_url_path2file_path($legal_url);
		 *                               to obtain the physical filesystem path (also available in the 'dir' $info entry, by the way!), or
		 *                                   $url = $mgr->legal2abs_url_path($legal_url);
		 *                               to obtain the absolute URI path for this parent directory.
		 *
		 *       'dir'                   (string) physical filesystem path to the parent directory of the directory being created.
		 *
		 *       'raw_name'              (string) the name of the directory to be created, as specified by the client (unfiltered!)
		 *
		 *       'uniq_name'             (string) the name of the directory to be created, filtered and ensured to be both unique and
		 *                               not-yet-existing in the filesystem.
		 *
		 *       'newdir'                (string) the filesystem absolute path to the directory to be created; identical to:
		 *                                   $newdir = $mgr->legal_url_path2file_path($legal_url . $uniq_name);
		 *                               Note the above: all paths are transformed from URI space to physical disk every time a change occurs;
		 *                               this allows us to map even not-existing 'directories' to possibly disparate filesystem locations.
		 *
		 *       'chmod'                 (integer) UNIX access rights (default: 0777) for the directory-to-be-created (RWX for user,group,world)
		 */
		return true;

	case 'destroy':
		/*
		 *     $fileinfo = array(
		 *         'dir' => (string) directory where the file / directory-to-be-deleted exists (filesystem absolute)
		 *         'file' => (string) the filename (with extension) of the file / directory to be deleted
		 *     );
		 */
		return true;

	case 'move':  // move or copy!
		/*
		 *   $info[] contains:
		 *
		 *       'legal_url'             (string) LEGAL URI path to the source parent directory of the file/directory being moved/copied. You may invoke
		 *                                   $dir = $mgr->legal_url_path2file_path($legal_url);
		 *                               to obtain the physical filesystem path (also available in the 'dir' $info entry, by the way!), or
		 *                                   $url = $mgr->legal2abs_url_path($legal_url);
		 *                               to obtain the absolute URI path for the given directory.
		 *
		 *       'dir'                   (string) physical filesystem path to the source parent directory of the file/directory being moved/copied.
		 *
		 *       'path'                  (string) physical filesystem path to the file/directory being moved/copied itself; this is the full source path.
		 *
		 *       'name'                  (string) the name itself of the file/directory being moved/copied; this is the source name.
		 *
		 *       'legal_newurl'          (string) LEGAL URI path to the target parent directory of the file/directory being moved/copied. You may invoke
		 *                                   $dir = $mgr->legal_url_path2file_path($legal_url);
		 *                               to obtain the physical filesystem path (also available in the 'dir' $info entry, by the way!), or
		 *                                   $url = $mgr->legal2abs_url_path($legal_url);
		 *                               to obtain the absolute URI path for the given directory.
		 *
		 *       'newdir'                (string) physical filesystem path to the target parent directory of the file/directory being moved/copied;
		 *                               this is the full path of the directory where the file/directory will be moved/copied to. (filesystem absolute)
		 *
		 *       'newpath'               (string) physical filesystem path to the target file/directory being moved/copied itself; this is the full destination path,
		 *                               i.e. the full path of where the file/directory should be renamed/moved to. (filesystem absolute)
		 *
		 *       'newname'               (string) the target name itself of the file/directory being moved/copied; this is the destination name.
		 *
		 *                               This filename is ensured to be both filesystem-legal, unique and not yet existing in the given target directory.
		 *
		 *       'rename'                (boolean) TRUE when a file/directory RENAME operation is requested (name change, staying within the same
		 *                               parent directory). FALSE otherwise.
		 *
		 *       'is_dir'                (boolean) TRUE when the subject is a directory itself, FALSE when it is a regular file.
		 *
		 *       'function'              (string) PHP call which will perform the operation. ('rename' or 'copy')
		 */
		return true;

	case 'view':
		/*
		 *   $info[] contains:
		 *
		 *       'legal_url'             (string) LEGAL URI path to the directory being viewed/scanned. You may invoke
		 *                                   $dir = $mgr->legal_url_path2file_path($legal_url);
		 *                               to obtain the physical filesystem path (also available in the 'dir' $info entry, by the way!), or
		 *                                   $url = $mgr->legal2abs_url_path($legal_url);
		 *                               to obtain the absolute URI path for the scanned directory.
		 *
		 *       'dir'                   (string) physical filesystem path to the directory being viewed/scanned.
		 *
		 *       'files'                 (array of strings) array of files and directories (including '..' entry at the top when this is a
		 *                               subdirectory of the FM-managed tree): only names, not full paths.
		 *
		 *       'mime_filter'           (optional, string) mime filter as specified by the client: a comma-separated string containing
		 *                               full or partial mime types, where a 'partial' mime types is the part of a mime type before
		 *                               and including the slash, e.g. 'image/'
		 *
		 *       'mime_filters'          (optional, array of strings) the set of allowed mime types, derived from the 'mime_filter' setting.
		 *
		 *       'guess_mime'            (boolean) TRUE when the mime type for each file in this directory will be determined using filename
		 *                               extension sniffing only; FALSE means the mime type will be determined using content sniffing, which
		 *                               is slower.
		 *
		 *       'list_type'             (string) the type of view requested: 'list' or 'thumb'.
		 *
		 *       'preliminary_json'      (array) the JSON data collected so far; when ['status']==1, then we're performing a regular view
		 *                               operation (possibly as the second half of a copy/move/delete operation), when the ['status']==0,
		 *                               we are performing a view operation as the second part of another otherwise failed action, e.g. a
		 *                               failed 'create directory'.
		 */
		return true;

	case 'detail':
		/*
		 *   $info[] contains:
		 *
		 *       'legal_url'             (string) LEGAL URI path to the file/directory being inspected. You may invoke
		 *                                   $dir = $mgr->legal_url_path2file_path($legal_url);
		 *                               to obtain the physical filesystem path (also available in the 'file' $info entry, by the way!), or
		 *                                   $url = $mgr->legal2abs_url_path($legal_url);
		 *                               to obtain the absolute URI path for the given file.
		 *
		 *       'file'                  (string) physical filesystem path to the file being inspected.
		 *
		 *       'filename'              (string) the filename of the file being inspected. (Identical to 'basename($legal_url)')
		 *
		 *       'mime'                  (string) the mime type as sniffed from the file
		 *
		 *       'mime_filter'           (optional, string) mime filter as specified by the client: a comma-separated string containing
		 *                               full or partial mime types, where a 'partial' mime types is the part of a mime type before
		 *                               and including the slash, e.g. 'image/'
		 *
		 *       'mime_filters'          (optional, array of strings) the set of allowed mime types, derived from the 'mime_filter' setting.
		 */
		return true;

	case 'thumbnail':
		/*
		 *   $info[] contains:
		 *
		 *       'legal_url'             (string) LEGAL URI path to the file/directory being thumbnailed. You may invoke
		 *                                   $dir = $mgr->legal_url_path2file_path($legal_url);
		 *                               to obtain the physical filesystem path (also available in the 'file' $info entry, by the way!), or
		 *                                   $url = $mgr->legal2abs_url_path($legal_url);
		 *                               to obtain the absolute URI path for the given file.
		 *
		 *       'file'                  (string) physical filesystem path to the file being inspected.
		 *
		 *       'filename'              (string) the filename of the file being inspected. (Identical to 'basename($legal_url)')
		 *
		 *       'mime'                  (string) the mime type as sniffed from the file
		 *
		 *       'mime_filter'           (optional, string) mime filter as specified by the client: a comma-separated string containing
		 *                               full or partial mime types, where a 'partial' mime types is the part of a mime type before
		 *                               and including the slash, e.g. 'image/'
		 *
		 *       'mime_filters'          (optional, array of strings) the set of allowed mime types, derived from the 'mime_filter' setting.
		 *
		 *       'requested_size'        (integer) the size (maximum width and height) in pixels of the thumbnail to be produced.
		 */
		return true;

	default:
		// unknown operation. Internal server error.
		return false;
	}
}














if (DEVELOPMENT) // debugging
{
	// fake a POST submit through a GET request so we can easily diag/debug event requests:
	if (!isset($_POST)) $_POST = array();
	foreach($_GET as $k => $v)
	{
		$_POST[$k] = $v;
	}
}
