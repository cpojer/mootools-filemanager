<?php

/* make sure no-one can run anything here if they didn't arrive through 'proper channels' */
if(!defined("COMPACTCMS_CODE")) { die('Illegal entry point!'); } /*MARKER*/

/*
 * Script: FMgr4Alias.php
 *   MooTools FileManager - Backend for the FileManager Script (with Alias path mapping support)
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
 *   FileManager Copyright (c) 2009-2011 [Christoph Pojer](http://cpojer.net)
 *   Backend: FileManager & FMgr4Alias Copyright (c) 2011 [Ger Hobbelt](http://hobbelt.com)
 *
 * Dependencies:
 *   - Tooling.php
 *   - Image.class.php
 *   - getId3 Library
 *   - FileManager.php
 */
 
require_once('FileManager.php');


/**
 * Example derived class for FileManager which is capable of handling Aliases as served through Apache's mod_alias, 
 * PROVIDED you have set up the Alias translation table in the constructor: you must pass this table in the
 * $options array as a mapping array in the constructor.
 */
class FileManagerWithAliasSupport extends FileManager
{
	protected $scandir_alias_lu_arr;
	
	public function __construct($options)
	{
		$this->scandir_alias_lu_arr = null;
		
		$options = array_merge(array(
			'Aliases' => null    // default is an empty Alias list.
		), (is_array($options) ? $options : array()));
		
		parent::__construct($options);
		
		/*
		 * Now process the Aliases array: 
		 * it works as-is for transforming URI to FILE path, but we need
		 * to munch the list for scandir() to have fast access at the same info:
		 *
		 * here the goal is for scandir() to show the aliases as (fake) directory
		 * entries, hence we need to collect the aliases per parent directory:
		 */
		if (is_array($this->options['Aliases']))
		{
			$alias_arr = $this->options['Aliases'];
			
			// collect the set of aliases per parent directory: we need a fully set up options['directory'] for this now
			$scandir_lookup_arr = array();
			
			// NOTE: we can use any of the url2file_path methods here as those only use the raw [Aliases] array
			
			foreach($alias_arr as $uri => $file)
			{
				$p_uri = parent::getParentDir($uri);
				$a_name = pathinfo($uri, PATHINFO_BASENAME);

				// as scandir works with filesystem paths, convert this URI path to a filesystem path:
				$p_dir = $this->url_path2file_path($p_uri);
				$p_dir = self::enforceTrailingSlash($p_dir);

				if (!isset($scandir_lookup_arr[$p_dir]))
				{
					$scandir_lookup_arr[$p_dir] = array();
				}
				$scandir_lookup_arr[$p_dir][] = /* 'alias' => */ $a_name;
			}
			
			$this->scandir_alias_lu_arr = $scandir_lookup_arr;
		}
	}
	
	/**
	 * @return array the FileManager options and settings.
	 */
	public function getSettings()
	{
		return array_merge(array(
				'scandir_alias_lu_arr' => $this->scandir_alias_lu_arr
		), parent::getSettings());
	}



	
	public function scandir($dir, $filemask = '*', $see_thumbnail_dir = false)
	{
		$dir = self::enforceTrailingSlash($dir);
		
		// collect the real items first:
		$coll = parent::scandir($dir, $filemask, $see_thumbnail_dir);
		if ($coll === false)
			return $coll;

			
		// make sure we keep the guarantee that the '..' entry, when present, is the very last one, intact:
		$doubledot = array_pop($coll);
		if ($doubledot !== null && $doubledot !== '..')
		{
			$coll[] = $doubledot;
			$doubledot = null;
		}
		
		
		// we must check against thumbnail path again, as it MAY be an alias, itself!
		$tndir = null;
		if (!$see_thumbnail_dir)
		{
			$tn_uri = $this->options['thumbnailPath'];
			$tnpath = $this->url_path2file_path($tn_uri);
			//if (FileManagerUtility::startswith($dir, $tnpath))
			//	return false;

			$tnparent = self::getParentDir($tnpath);
			$just_below_thumbnail_dir = FileManagerUtility::startswith($dir, $tnparent);

			if ($just_below_thumbnail_dir)
			{
				$tndir = basename(substr($tn_uri, 0, -1));
			}
		}

		
		// now see if we need to add any aliases as elements:
		if (isset($this->scandir_alias_lu_arr) && !empty($this->scandir_alias_lu_arr[$dir]))
		{
			foreach($this->scandir_alias_lu_arr[$dir] as $a_elem)
			{
				if (!in_array($a_elem, $coll, true) && $tndir !== $a_elem)
					$coll[] = $a_elem;
			}
		}
		
		// make sure we keep the guarantee that the '..' entry, when present, is the very last one, intact:
		if ($doubledot !== null)
		{
			$coll[] = $doubledot;
		}
		
		return $coll;
	}

	
	
	
	/**
	 * Return the filesystem absolute path for the relative or absolute URI path.
	 *
	 * Takes the ['Aliases'] mapping array into account; it is processed from top to bottom a la mod_alias.
	 *
	 * Note: as it uses normalize(), any illegal path will throw an FileManagerException
	 *
	 * Returns a fully normalized filesystem absolute path.
	 */
	public function url_path2file_path($url_path)
	{
		$url_path = $this->rel2abs_url_path($url_path);

		$replaced_some = false;
		if (is_array($this->options['Aliases']))
		{
			$alias_arr = $this->options['Aliases'];
			
			foreach($alias_arr as $a_url => $a_path)
			{
				// if the uri path matches us (or at least our start), then apply the mapping.
				// Make sure to only match entire path elements:
				if (FileManagerUtility::startsWith($url_path . '/', $a_url . '/'))
				{
					$url_path = $a_path . substr($url_path, strlen($a_url));
					$replaced_some = true;
				}
			}
		}
		
		if (!$replaced_some)
		{
			$url_path = parent::url_path2file_path($url_path);
		}
		
		return $url_path;
	}
	
	
	
}

