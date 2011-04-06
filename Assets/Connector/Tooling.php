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




if (!function_exists('safe_glob'))
{
	/**#@+
	 * Extra GLOB constant for safe_glob()
	 */
	if (!defined('GLOB_NODIR'))       define('GLOB_NODIR',256);
	if (!defined('GLOB_PATH'))        define('GLOB_PATH',512);
	if (!defined('GLOB_NODOTS'))      define('GLOB_NODOTS',1024);
	if (!defined('GLOB_RECURSE'))     define('GLOB_RECURSE',2048);
	if (!defined('GLOB_NOHIDDEN'))    define('GLOB_NOHIDDEN',4096);
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
	 * Additional flags: GLOB_NODIR, GLOB_PATH, GLOB_NODOTS, GLOB_RECURSE, GLOB_NOHIDDEN
	 * (not original glob() flags)
	 *
	 * @author BigueNique AT yahoo DOT ca
	 * @updates
	 * - 080324 Added support for additional flags: GLOB_NODIR, GLOB_PATH,
	 *   GLOB_NODOTS, GLOB_RECURSE
	 * - [i_a] Added support for GLOB_NOHIDDEN
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
					  && ( (!($flags & GLOB_NODOTS)) || (!in_array($file, array('.', '..'))) ) 
					  && ( (!($flags & GLOB_NOHIDDEN)) || ($file[0] != '.' || $file == '..')) )
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




// derived from http://nl.php.net/manual/en/function.http-build-query.php#90438
if (!function_exists('http_build_query_ex'))
{
	if (!defined('PHP_QUERY_RFC1738')) define('PHP_QUERY_RFC1738', 1); // encoding is performed per RFC 1738 and the application/x-www-form-urlencoded media type, which implies that spaces are encoded as plus (+) signs.
	if (!defined('PHP_QUERY_RFC3986')) define('PHP_QUERY_RFC3986', 2); // encoding is performed according to » RFC 3986, and spaces will be percent encoded (%20).

	function http_build_query_ex($data, $prefix = '', $sep = '', $key = '', $enc_type = PHP_QUERY_RFC1738)
	{
		$ret = array();
		if (!is_array($data) && !is_object($data))
		{
			if ($enc_type == PHP_QUERY_RFC1738)
			{
				$ret[] = urlencode($data);
			}
			else
			{
				$ret[] = rawurlencode($data);
			}
		}
		else
		{
			if (!empty($prefix))
			{
				if ($enc_type == PHP_QUERY_RFC1738)
				{
					$prefix = urlencode($prefix);
				}
				else
				{
					$prefix = rawurlencode($prefix);
				}
			}
			foreach ($data as $k => $v)
			{
				if (is_int($k))
				{
					$k = $prefix . $k;
				}
				else if ($enc_type == PHP_QUERY_RFC1738)
				{
					$k = urlencode($k);
				}
				else
				{
					$k = rawurlencode($k);
				}
				if (!empty($key) || $key === 0)
				{
					$k = $key . '[' . $k . ']';
				}
				if (is_array($v) || is_object($v))
				{
					$ret[] = http_build_query_ex($v, '', $sep, $k, $enc_type);
				}
				else
				{
					if ($enc_type == PHP_QUERY_RFC1738)
					{
						$v = urlencode($v);
					}
					else
					{
						$v = rawurlencode($v);
					}
					$ret[] = $k . '=' . $v;
				}
			}
		}
		if (empty($sep)) $sep = ini_get('arg_separator.output');
		return implode($sep, $ret);
	}
}



/**
 * Determine how the PHP interpreter was invoked: cli/cgi/fastcgi/server,
 * where 'server' implies PHP is part of a webserver in the form of a 'module' (e.g. mod_php5) or similar.
 *
 * This information is used, for example, to decide the correct way to send the 'respose header code':
 * see send_response_status_header().
 */
if (!function_exists('get_interpreter_invocation_mode'))
{
	function get_interpreter_invocation_mode()
	{
		global $_ENV;
		global $_SERVER;

		/*
		 * see
		 *
		 * http://nl2.php.net/manual/en/function.php-sapi-name.php
		 * http://stackoverflow.com/questions/190759/can-php-detect-if-its-run-from-a-cron-job-or-from-the-command-line
		 */
		$mode = "server";
		$name = php_sapi_name();
		if (preg_match("/fcgi/", $name) == 1)
		{
			$mode = "fastcgi";
		}
		else if (preg_match("/cli/", $name) == 1)
		{
			$mode = "cli";
		}
		else if (preg_match("/cgi/", $name) == 1)
		{
			$mode = "cgi";
		}

		/*
		 * check whether POSIX functions have been compiled/enabled; xampp on Win32/64 doesn't have the buggers! :-(
		 */
		if (function_exists('posix_isatty'))
		{
			if (posix_isatty(STDOUT))
			{
				/* even when seemingly run as cgi/fastcgi, a valid stdout TTY implies an interactive commandline run */
				$mode = 'cli';
			}
		}

		if (!empty($_ENV['TERM']) && empty($_SERVER['REMOTE_ADDR']))
		{
			/* even when seemingly run as cgi/fastcgi, a valid stdout TTY implies an interactive commandline run */
			$mode = 'cli';
		}

		return $mode;
	}
}






/**
 * Return the HTTP response code string for the given response code
 */
if (!function_exists('get_response_code_string'))
{
	function get_response_code_string($response_code)
	{
		$response_code = intval($response_code);
		switch ($response_code)
		{
		case 100:   return "RFC2616 Section 10.1.1: Continue";
		case 101:   return "RFC2616 Section 10.1.2: Switching Protocols";
		case 200:   return "RFC2616 Section 10.2.1: OK";
		case 201:   return "RFC2616 Section 10.2.2: Created";
		case 202:   return "RFC2616 Section 10.2.3: Accepted";
		case 203:   return "RFC2616 Section 10.2.4: Non-Authoritative Information";
		case 204:   return "RFC2616 Section 10.2.5: No Content";
		case 205:   return "RFC2616 Section 10.2.6: Reset Content";
		case 206:   return "RFC2616 Section 10.2.7: Partial Content";
		case 300:   return "RFC2616 Section 10.3.1: Multiple Choices";
		case 301:   return "RFC2616 Section 10.3.2: Moved Permanently";
		case 302:   return "RFC2616 Section 10.3.3: Found";
		case 303:   return "RFC2616 Section 10.3.4: See Other";
		case 304:   return "RFC2616 Section 10.3.5: Not Modified";
		case 305:   return "RFC2616 Section 10.3.6: Use Proxy";
		case 307:   return "RFC2616 Section 10.3.8: Temporary Redirect";
		case 400:   return "RFC2616 Section 10.4.1: Bad Request";
		case 401:   return "RFC2616 Section 10.4.2: Unauthorized";
		case 402:   return "RFC2616 Section 10.4.3: Payment Required";
		case 403:   return "RFC2616 Section 10.4.4: Forbidden";
		case 404:   return "RFC2616 Section 10.4.5: Not Found";
		case 405:   return "RFC2616 Section 10.4.6: Method Not Allowed";
		case 406:   return "RFC2616 Section 10.4.7: Not Acceptable";
		case 407:   return "RFC2616 Section 10.4.8: Proxy Authentication Required";
		case 408:   return "RFC2616 Section 10.4.9: Request Time-out";
		case 409:   return "RFC2616 Section 10.4.10: Conflict";
		case 410:   return "RFC2616 Section 10.4.11: Gone";
		case 411:   return "RFC2616 Section 10.4.12: Length Required";
		case 412:   return "RFC2616 Section 10.4.13: Precondition Failed";
		case 413:   return "RFC2616 Section 10.4.14: Request Entity Too Large";
		case 414:   return "RFC2616 Section 10.4.15: Request-URI Too Large";
		case 415:   return "RFC2616 Section 10.4.16: Unsupported Media Type";
		case 416:   return "RFC2616 Section 10.4.17: Requested range not satisfiable";
		case 417:   return "RFC2616 Section 10.4.18: Expectation Failed";
		case 500:   return "RFC2616 Section 10.5.1: Internal Server Error";
		case 501:   return "RFC2616 Section 10.5.2: Not Implemented";
		case 502:   return "RFC2616 Section 10.5.3: Bad Gateway";
		case 503:   return "RFC2616 Section 10.5.4: Service Unavailable";
		case 504:   return "RFC2616 Section 10.5.5: Gateway Time-out";
		case 505:   return "RFC2616 Section 10.5.6: HTTP Version not supported";
	/*
		case 102:   return "Processing";  // http://www.askapache.com/htaccess/apache-status-code-headers-errordocument.html#m0-askapache3
		case 207:   return "Multi-Status";
		case 418:   return "I'm a teapot";
		case 419:   return "unused";
		case 420:   return "unused";
		case 421:   return "unused";
		case 422:   return "Unproccessable entity";
		case 423:   return "Locked";
		case 424:   return "Failed Dependency";
		case 425:   return "Node code";
		case 426:   return "Upgrade Required";
		case 506:   return "Variant Also Negotiates";
		case 507:   return "Insufficient Storage";
		case 508:   return "unused";
		case 509:   return "unused";
		case 510:   return "Not Extended";
	*/
		default:   return rtrim("Unknown Response Code " . $response_code);
		}
	}
}



/**
 * Performs the correct way of transmitting the response status code header: PHP header() must be invoked in different ways
 * dependent on the way the PHP interpreter has been invoked.
 *
 * See also:
 *
 * http://nl2.php.net/manual/en/function.header.php
 */
if (!function_exists('send_response_status_header'))
{
	function send_response_status_header($response_code)
	{
		$mode = get_interpreter_invocation_mode();
		switch ($mode)
		{
		default:
		case 'fcgi':
			header('Status: ' . $response_code, true, $response_code);
			break;

		case 'server':
			header('HTTP/1.0 ' . $response_code . ' ' . get_response_code_string($response_code), true, $response_code);
			break;
		}
	}
}








