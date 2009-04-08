<?php
/**
 * 
 * TODO: Clean this UP!
 * TODO: Fix "Files/" Folder
 * TODO: Fix E_NOTICE and access of POST/GET
 * TODO: Fix access restrictions of methods
 * TODO Fix "Images/" Folder
 * 
 * */

require_once('./Upload.php');
require_once('./Image.php');

$browser = new Browser();
$event = !empty($_GET['event']) ? 'on'.ucfirst($_GET['event']) : null;
if(!$event || !method_exists($browser, $event)) $event = 'onView';

$browser->{$event}();

class Utility {
	
	public static function endsWith($string, $look){
		return strrpos($string, $look)===strlen($string)-strlen($look);
	}
	
	public static function startsWith($string, $look){
		return strpos($string, $look)===0;
	}
	
}

class Browser {
	
	public static $path = null,
		$length = null,
		$basedir = null;
	
	private static $admin = false;
	
	protected $filters = array('image');
	private $post, $get;
	
	public static function setPaths(){
		self::$path = realpath('../Demos/');
		self::$length = strlen(self::$path);
		self::$basedir = realpath(self::$path.'/Files/');
	}
	
	public function __construct(){
		self::setPaths();
		
		/* TODO: Clean this up and fix it! */
		$this->get = $_GET;
		$this->post = $_POST;
	}
	
	public function onView(){
		$filter = !empty($this->post['filter']) && in_array($this->post['filter'], $this->filters) ? $this->post['filter'].'/' : null;
		
		$dir = self::getDir($this->post['dir']);
		
		$files = glob($dir.'/*');
		
		if($dir!=self::$basedir) array_unshift($files, $dir.'/..');
		
		natcasesort($files);
		foreach($files as $file){
			$mime = self::getMimeType($file);
			
			if($filter && $mime!='text/directory' && !Utility::startsWith($mime, $filter))
				continue;
			
			$out[is_dir($file) ? 0 : 1][] = array(
				'name' => pathinfo($file, PATHINFO_BASENAME),
				'date' => date('d.m.y - h:i', filemtime($file)),
				'mime' => self::getMimeType($file),
				'icon' => self::getIcon(self::normalize($file)),
				'size' => filesize($file),
			);
		}
		
		$out = array(
			'path' => self::getPath($dir),
			'dir' => array(
				'name' => pathinfo($dir, PATHINFO_BASENAME),
				'date' => date('d.m.y - h:i', filemtime($dir)),
				'mime' => 'text/directory',
				'icon' => 'dir',
			),
			'files' => array_merge(!empty($out[0]) ? $out[0] : array(), !empty($out[1]) ? $out[1] : array()),
		);
		
		echo json_encode($out);
	}
	
	public function onList(){
		$file = realpath($this->post['dir'].'/'.$this->post['file']);
		
		if(!self::checkFile($file)) return;
		
		$mime = self::getMimeType($file);
		
		Core::loadAsset('getid3/getid3');
		Core::loadAsset('FileInfo');
		
		echo json_encode(array(
			'content' => FileInfo::get($file, self::normalize(substr($file, strlen(self::$path)+1)), $mime)
		));
	}
	
	public function onDestroy(){
		$file = realpath($this->post['dir'].'/'.$this->post['file']);
		
		if(!self::checkFile($file)) return;
		
		self::unlink($file);
		
		echo json_encode(array(
			'content' => 'destroyed',
		));
	}
	
	public function onCreate(){
		$file = self::getName($this->post['file'], $this->post['dir']);
		
		if(!$file) return;
		
		mkdir($file);
		
		$this->onView();
	}
	
	public function onUpload(){
		$dir = $this->get['n'];
		array_shift($dir); // Layername
		array_shift($dir); // Actionname
		
		if($this->get['session'] && $this->get['name'] && $this->get['id']){
			$user = db::select('users')->where(array(
				'name' => $this->get['name'],
				'AND',
				'id' => array($this->get['id'], 'id'),
			))->fetch();
			
			if(!$user['id'] || md5($user['id'].' '.$user['session'].' '.Core::retrieve('secure'))!=$this->get['session'])
				return;
			
			$dir = self::getDir(implode('\\', $dir));
			/*$u = new Upload($_FILES['Filedata']);
			
			if($this->get['resize'] && $u->file_is_image && ($u->image_src_x>800 || $u->image_src_y>600)){
				$u->image_resize = true;
				$u->image_ratio_crop = true;
				
				if($u->image_src_x>800){
					$u->image_x = 800;
					$u->image_ratio_y = true;
				}elseif($u->image_src_y>600){
					$u->image_y = 600;
					$u->image_ratio_x = true;
				}
			}
			
			$u->process($dir);*/
			
			echo json_encode(array(
				'result' => $u->processed ? 'success' : 'false',
				'error' => $u->error,
			));
		}
	}
	
	/* This method is used by both move and rename */
	public function onMove(){
		$rename = !$this->post['ndir'] && $this->post['name'] ? true : false;
		$dir = self::getDir($this->post['dir']);
		$file = realpath($dir.'/'.$this->post['file']);
		
		$is_dir = is_dir($file);
		if(!self::checkFile($file) || (!$rename && $is_dir))
			return;
		
		if(!$is_dir) self::unlinkThumb($file);
		if($rename && $is_dir){
			$newname = self::getName($this->post['name'], $dir);
			
			if(!$newname) return;
			
			rename($file, $newname);
			
			$newname = explode('/', self::normalize($newname));
			echo json_encode(array(
				'name' => end($newname),
			));
			return;
		}
		
		/*$u = new Upload($file);
		$u->mime_check = false;
		
		$moveTo = $rename ? $dir : self::getDir($this->post['ndir']);
		if($rename) $u->file_new_name_body = $this->post['name'];
		
		$u->process($moveTo);
		if($u->processed && (!$this->post['copy'] || $rename))
			self::unlink($file);*/
		
		echo json_encode(array(
			'name' => $u->file_dst_name,
		));
	}
	
	public static function getName($file, $dir){
		$dir = self::getDir($dir.'/');
		foreach(glob($dir.'/*') as $f)
			$files[] = pathinfo($f, PATHINFO_FILENAME);
		
		$file = Data::pagetitle($file, array(
			'contents' => $files,
		));
		
		$file = realpath($dir).'/'.$file;
		if(!$file || !Utility::startsWith($file, self::$basedir)) return;
		
		if(file_exists($file)) return;
		
		return self::normalize($file);
	}
	
	
	public function getIcon($file){
		if(Utility::endsWith($file, '/..')) return 'dir_up';
		else if(is_dir($file)) return 'dir';
		
		$ext = pathinfo($file, PATHINFO_EXTENSION);
		
		return ($ext && file_exists(realpath('../Images/Icons/'.$ext.'.png'))) ? $ext : 'default';
	}

	public static function getMimeType($file){
		return is_dir($file) ? 'text/directory' : Upload::mime($file);
	}
	
	public static function getDir($dir){
		$dir = realpath((!Utility::startsWith($dir, 'Files/') ? 'Files/' : '').$dir);
		return self::checkFile($dir) ? $dir : self::$basedir;
	}
	
	public static function unlink($file){
		$file = realpath($file);
		if(self::$basedir==$file || strlen(self::$basedir)>=strlen($file))
			return;
		
		if(is_dir($file)){
			$files = glob($file.'/*');
			if(is_array($files))
				foreach($files as $f)
					self::unlink($f);
				
			rmdir($file);
		}else{
			try{
				if(self::checkFile($file)){
					self::unlinkThumb($file);
					
					unlink($file);
				}
			}catch(Exception $e){}
		}
	}
	
	public static function unlinkThumb($file){
		$file = realpath($file);
					
		$ext = pathinfo($file, PATHINFO_EXTENSION);
		if(in_array(strtolower($ext), array('png', 'jpg', 'gif', 'jpeg'))){
			$cache = realpath('../ThumbCache/');
			
			$identifier = md5($file);
			$filename = $cache.'/'.$identifier.'.'.$ext;
			if(file_exists($filename)) unlink($filename);
		}
	}
	
	public static function getPath($file){
		$file = self::normalize(substr($file, self::$length));
		return substr($file, Utility::startsWith($file, '/') ? 1 : 0);
	}
	
	public static function checkFile($file){
		return !(!$file || !Utility::startsWith($file, self::$basedir) || !file_exists($file));
	}
	
	public static function normalize($file){
		return preg_replace('/\\\|\/{2,}/', '/', $file);
	}

}