<?php
/**
 * Styx::Upload - Handles file uploads
 *
 * @package Styx
 * @subpackage Utility
 *
 * @license MIT-style License
 * @author Christoph Pojer <christoph.pojer@gmail.com>
 */

class Upload {
	
	/**
	 * Moves the uploaded file to the specified location. It throws a UploadException
	 * if anything goes wrong except for if the upload does not exist. This can be checked with {@link Upload::exists()}
	 *
	 * @param string $file
	 * @param string $to
	 * @param array $options
	 * @return bool|string Path to moved file or false if the specified upload does not exist
	 */
	public static function move($file, $to, $options = null){
		if(!self::exists($file)) return false;
		
		$default = array(
			'name' => null,
			'size' => null,
			'chmod' => 0777,
			'overwrite' => false,
			'mimes' => array(),
		);
		
		$default = array_merge($default, $options);
		
		$file = $_FILES[$file];
		
		if($default['size'] && $file['size']>$default['size'])
			throw new UploadException('size');
		
		$pathinfo = pathinfo($file['name']);
		if(!$pathinfo['extension'])
			throw new UploadException('extension');
		
		if(count($default['mimes'])){
			$mime = self::mime($file['tmp_name'], $file['type']);
			
			if(!$mime || !in_array($mime, $default['mimes']))
				throw new UploadException('extension');
		}
		
		$file['ext'] = strtolower($pathinfo['extension']);
		$file['base'] = basename($pathinfo['basename'], '.'.$pathinfo['extension']);
		
		$real = realpath($to);
		if(!$real) throw new UploadException('path');
		
		if(is_dir($real))
			$to = $real.'/'.($default['name'] ? $default['name'] : $file['base']).'.'.$file['ext'];
		
		if(!$default['overwrite'] && file_exists($to))
			throw new UploadException('exists');
		
		if(!move_uploaded_file($file['tmp_name'], $to))
			throw new UploadException(strtolower($_FILES[$file]['error']<=2 ? 'size' : ($_FILES[$file]['error']==3 ? 'partial' : 'nofile')));
		
		chmod($to, $default['chmod']);
		
		return realpath($to);
	}
	
	/**
	 * Returns whether the Upload exists or not
	 *
	 * @param string $file
	 * @return bool
	 */
	public function exists($file){
		return !(empty($_FILES[$file]['name']) || empty($_FILES[$file]['size']));
	}
	
	/**
	 * Returns (if possible) the mimetype of the given file
	 *
	 * @param string $file
	 * @param sring $default The default mimetype to return if none is found. If application/octet-stream is passed it tries to guess the mimetype (Flash-Upload maybe?)
	 */
	public function mime($file, $default = null){
		$file = realpath($file);
		$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
		
		$mime = null;
		if(function_exists('finfo_open') && $f = finfo_open(FILEINFO_MIME, getenv('MAGIC'))){
			$mime = finfo_file($f, $file);
			finfo_close($f);
		}
		
		if(!$mime && in_array($ext, array('gif', 'jpg', 'jpeg', 'png'))){
			$image = getimagesize($file);
			if(!empty($image['mime']))
				$mime = $image['mime'];
		}
		
		if(!$mime && $default) $mime = $default;
		
		if((!$mime || $mime=='application/octet-stream') && $ext){
			static $mimes;
			if(!$mimes) $mimes = parse_ini_file(pathinfo(__FILE__, PATHINFO_DIRNAME).'/MimeTypes.ini');
			
			if(!empty($mimes[$ext])) return $mimes[$ext];
		}
		
		return $mime;
	}
	
}

class UploadException extends Exception {}