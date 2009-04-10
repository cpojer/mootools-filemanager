<?php
/**
 * 
 * TODO: Clean this UP!
 * TODO: Fix "Files/" Folder
 * TODO: Fix E_NOTICE and access of POST/GET
 * TODO: Fix access restrictions of methods
 * TODO: Fix "Images/" Folder
 * TODO: Fix Filters
 * 
 * */

require_once('./Upload.php');
require_once('./Image.php');

$browser = new Browser(array(
	'folder' => '../Demos/Files',
	'images' => '../Images',
	'dateformat' => 'd.m.y - h:i',
));

$event = !empty($_GET['event']) ? 'on'.ucfirst($_GET['event']) : null;
if(!$event || !method_exists($browser, $event)) $event = 'onView';
$browser->{$event}();

class Browser {
	
	private $path = null,
		$length = null,
		$basedir = null,
		$basename = null,
		$options,
		$filters = array('image'),
		$post,
		$get;
	
	public function __construct($options){
		$this->options = array_merge(array(
			'folder' => '../Demos/Files',
			'images' => '../Images',
			'dateformat' => 'd.m.y - h:i',
		), $options);
		
		$this->basedir = realpath($this->options['folder']);
		$this->basename = pathinfo($this->basedir, PATHINFO_BASENAME).'/';
		$this->path = realpath($this->options['folder'].'/../');
		$this->length = strlen($this->path);
		
		/* TODO: Clean this up and fix it! */
		$this->get = $_GET;
		$this->post = $_POST;
	}
	
	public function onView(){
		$filter = !empty($this->post['filter']) && in_array($this->post['filter'], $this->filters) ? $this->post['filter'].'/' : null;
		$dir = $this->getDir($this->post['dir']);
		$files = glob($dir.'/*');
		
		if($dir!=$this->basedir) array_unshift($files, $dir.'/..');
		
		natcasesort($files);
		foreach($files as $file){
			$mime = $this->getMimeType($file);
			if($filter && $mime!='text/directory' && !Utility::startsWith($mime, $filter))
				continue;
			
			$out[is_dir($file) ? 0 : 1][] = array(
				'name' => pathinfo($file, PATHINFO_BASENAME),
				'date' => date($this->options['dateformat'], filemtime($file)),
				'mime' => $this->getMimeType($file),
				'icon' => $this->getIcon($this->normalize($file)),
				'size' => filesize($file),
			);
		}
		
		echo json_encode(array(
			'path' => $this->getPath($dir),
			'dir' => array(
				'name' => pathinfo($dir, PATHINFO_BASENAME),
				'date' => date($this->options['dateformat'], filemtime($dir)),
				'mime' => 'text/directory',
				'icon' => 'dir',
			),
			'files' => array_merge(!empty($out[0]) ? $out[0] : array(), !empty($out[1]) ? $out[1] : array()),
		));
	}
	
	public function onList(){
		$file = realpath($this->path.'/'.$this->post['dir'].'/'.$this->post['file']);
		
		if(!$this->checkFile($file)) return;
		
		Core::loadAsset('getid3/getid3');
		Core::loadAsset('FileInfo');
		
		echo json_encode(array(
			'content' => FileInfo::get($file, $this->normalize(substr($file, strlen($this->path)+1)), $this->getMimeType($file))
		));
	}
	
	public function onDestroy(){
		$file = realpath($this->path.'/'.$this->post['dir'].'/'.$this->post['file']);
		
		if(!$this->checkFile($file)) return;
		
		$this->unlink($file);
		
		echo json_encode(array(
			'content' => 'destroyed',
		));
	}
	
	public function onCreate(){
		$file = $this->getName($this->post['file'], $this->getDir($this->post['dir']));
		
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
			
			$dir = $this->getDir(implode('\\', $dir));
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
		$rename = empty($this->post['ndir']) && !empty($this->post['name']);
		$dir = $this->getDir($this->post['dir']);
		$file = realpath($dir.'/'.$this->post['file']);
		
		$is_dir = is_dir($file);
		if(!$this->checkFile($file) || (!$rename && $is_dir))
			return;
		
		if($rename || $is_dir){
			$newname = $this->getName($this->post['name'], $dir);
			$fn = 'rename';
		}else{
			$newname = $this->getName(pathinfo($file, PATHINFO_FILENAME), $this->getDir($this->post['ndir']));
			$fn = !empty($this->post['copy']) ? 'copy' : 'rename';
		}
		
		if(!$newname) return;
		
		$ext = pathinfo($file, PATHINFO_EXTENSION);
		if($ext) $newname .= '.'.$ext;
		$fn($file, $newname);
		
		echo json_encode(array(
			'name' => pathinfo($this->normalize($newname), PATHINFO_BASENAME),
		));
	}
	
	private function unlink($file){
		$file = realpath($file);
		if($this->basedir==$file || strlen($this->basedir)>=strlen($file))
			return;
		
		if(is_dir($file)){
			$files = glob($file.'/*');
			if(is_array($files))
				foreach($files as $f)
					$this->unlink($f);
				
			rmdir($file);
		}else{
			try{ if($this->checkFile($file)) unlink($file); }catch(Exception $e){}
		}
	}
	
	public function getName($file, $dir){
		foreach(glob($dir.'/*') as $f)
			$files[] = pathinfo($f, PATHINFO_FILENAME);
		
		$file = $dir.'/'.Utility::pagetitle($file, $files);
		
		if(!$file || !Utility::startsWith($file, $this->basedir)) return null;
		return file_exists($file) ? null : $file;
	}
	
	private function getIcon($file){
		if(Utility::endsWith($file, '/..')) return 'dir_up';
		else if(is_dir($file)) return 'dir';
		
		$ext = pathinfo($file, PATHINFO_EXTENSION);
		return ($ext && file_exists(realpath($this->options['images'].'/Icons/'.$ext.'.png'))) ? $ext : 'default';
	}

	private function getMimeType($file){
		return is_dir($file) ? 'text/directory' : Upload::mime($file);
	}
	
	private function getDir($dir){
		$dir = realpath($this->path.'/'.(Utility::startsWith($dir, $this->basename) ? $dir : $this->basename));
		return $this->checkFile($dir) ? $dir : $this->basedir;
	}
	
	private function getPath($file){
		$file = $this->normalize(substr($file, $this->length));
		return substr($file, Utility::startsWith($file, '/') ? 1 : 0);
	}
	
	private function checkFile($file){
		return !(!$file || !Utility::startsWith($file, $this->basedir) || !file_exists($file));
	}
	
	private function normalize($file){
		return preg_replace('/\\\|\/{2,}/', '/', $file);
	}

}

/* Stripped-down version of some Styx PHP Framework-Functionality bundled with this FileBrowser. Styx is located at: http://styx.og5.net */
class Utility {
	
	public static function endsWith($string, $look){
		return strrpos($string, $look)===strlen($string)-strlen($look);
	}
	
	public static function startsWith($string, $look){
		return strpos($string, $look)===0;
	}
	
	public static function pagetitle($data, $options = array()){
		static $regex;
		if(!$regex){
			$regex = array(
				explode(' ', 'Æ æ Œ œ ß Ü ü Ö ö Ä ä À Á Â Ã Ä Å &#260; &#258; Ç &#262; &#268; &#270; &#272; Ð È É Ê Ë &#280; &#282; &#286; Ì Í Î Ï &#304; &#321; &#317; &#313; Ñ &#323; &#327; Ò Ó Ô Õ Ö Ø &#336; &#340; &#344; Š &#346; &#350; &#356; &#354; Ù Ú Û Ü &#366; &#368; Ý Ž &#377; &#379; à á â ã ä å &#261; &#259; ç &#263; &#269; &#271; &#273; è é ê ë &#281; &#283; &#287; ì í î ï &#305; &#322; &#318; &#314; ñ &#324; &#328; ð ò ó ô õ ö ø &#337; &#341; &#345; &#347; š &#351; &#357; &#355; ù ú û ü &#367; &#369; ý ÿ ž &#378; &#380;'),
				explode(' ', 'Ae ae Oe oe ss Ue ue Oe oe Ae ae A A A A A A A A C C C D D D E E E E E E G I I I I I L L L N N N O O O O O O O R R S S S T T U U U U U U Y Z Z Z a a a a a a a a c c c d d e e e e e e g i i i i i l l l n n n o o o o o o o o r r s s s t t u u u u u u y y z z z'),
			);
			
			$regex[0][] = '"';
			$regex[0][] = "'";
		}
		
		$data = trim(substr(preg_replace('/(?:[^A-z0-9]|_|\^)+/i', '_', str_replace($regex[0], $regex[1], $data)), 0, 64), '_');
		return !empty($options) ? self::checkTitle($data, $options) : $data;
	}
	
	protected static function checkTitle($data, $options = array(), $i = 0){
		if(!is_array($options)) return $data;
		
		foreach($options as $content)
			if($content && strtolower($content)==strtolower($data.($i ? '_'.$i : '')))
				return self::checkTitle($data, $options, ++$i);
		
		return $data.($i ? '_'.$i : '');
	}
	
}