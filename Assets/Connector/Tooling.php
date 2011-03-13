<?php
/*
 * Script: Tooling.php
 *   MooTools FileManager - Backend for the FileManager Script - Support Code
 * 
 * Authors:
 *  - Christoph Pojer (http://cpojer.net) (author)
 *  - James Ehly (http://www.devtrench.com)
 *  - Fabian Vogelsteller (http://frozeman.de)
 *  - Ger Hobbelt (http://hebbut.net)
 * 
 * License:
 *   MIT-style license.
 * 
 * Copyright:
 *   Copyright (c) 2011 [Christoph Pojer](http://cpojer.net)
 */


/* make sure no-one can run anything here if they didn't arrive through 'proper channels' */
if(!defined("COMPACTCMS_CODE")) { die('Illegal entry point!'); } /*MARKER*/




if (!function_exists('safe_glob'))
{
	/**#@+
	 * Extra GLOB constant for safe_glob()
	 */
	if (!defined('GLOB_NODIR'))       define('GLOB_NODIR',256);
	if (!defined('GLOB_PATH'))        define('GLOB_PATH',512);
	if (!defined('GLOB_NODOTS'))      define('GLOB_NODOTS',1024);
	if (!defined('GLOB_RECURSE'))     define('GLOB_RECURSE',2048);
	/**#@-*/

	
	/**
	 * A safe empowered glob().
	 *
	 * Function glob() is prohibited on some server (probably in safe mode)
	 * (Message "Warning: glob() has been disabled for security reasons in
	 * (script) on line (line)") for security reasons as stated on:
	 * http://seclists.org/fulldisclosure/2005/Sep/0001.html
	 *
	 * safe_glob() intends to replace glob() using readdir() & fnmatch() instead.
	 * Supported flags: GLOB_MARK, GLOB_NOSORT, GLOB_ONLYDIR
	 * Additional flags: GLOB_NODIR, GLOB_PATH, GLOB_NODOTS, GLOB_RECURSE
	 * (not original glob() flags)
	 *
	 * @author BigueNique AT yahoo DOT ca
	 * @updates
	 * - 080324 Added support for additional flags: GLOB_NODIR, GLOB_PATH,
	 *   GLOB_NODOTS, GLOB_RECURSE
	 */
	function safe_glob($pattern, $flags = 0)
	{
		$split = explode('/', str_replace('\\', '/', $pattern));
		$mask = array_pop($split);
		$path = implode('/', $split);
		if (($dir = @opendir($path)) !== false)
		{
			$glob = array();
			while(($file = readdir($dir)) !== false)
			{
				// Recurse subdirectories (GLOB_RECURSE); speedup: no need to sort the intermediate results
				if (($flags & GLOB_RECURSE) && is_dir($file) && (!in_array($file, array('.', '..'))))
				{
					$glob = array_merge($glob, array_prepend(safe_glob($path . '/' . $file . '/' . $mask, $flags | GLOB_NOSORT), ($flags & GLOB_PATH ? '' : $file . '/')));
				}
				// Match file mask
				if (fnmatch($mask, $file))
				{
					if ( ( (!($flags & GLOB_ONLYDIR)) || is_dir($path . '/' . $file) )
					  && ( (!($flags & GLOB_NODIR)) || (!is_dir($path . '/' . $file)) )
					  && ( (!($flags & GLOB_NODOTS)) || (!in_array($file, array('.', '..'))) ) )
					{
						$glob[] = ($flags & GLOB_PATH ? $path . '/' : '') . $file . (($flags & GLOB_MARK) && is_dir($path . '/' . $file) ? '/' : '');
					}
				}
			}
			closedir($dir);
			if (!($flags & GLOB_NOSORT)) sort($glob);
			return $glob;
		}
		else
		{
			return false;
		}
	}
}
