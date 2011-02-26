<?php
/*
Script: FileManager.php
  MooTools FileManager - Backend for the FileManager Script

Authors:
 - Christoph Pojer (http://cpojer.net) (author)
 - James Ehly (http://www.devtrench.com) 
 - Fabian Vogelsteller (http://frozeman.de) 

License:
  MIT-style license.

Copyright:
  Copyright (c) 2009 [Christoph Pojer](http://cpojer.net)

Dependencies:
  - Upload.php
  - Image.class.php
  - getId3 Library

Options:
  - directory: (string) The base directory to be used for the FileManger
  - assetBasePath: (string) The path to all images and swf files used by the filemanager
  - thumbnailPath: (string) The path where the thumbnails of the pictures will be saved
  - mimeTypesPath: (string, optional, relative path) The path to the MimTypes.ini file.
  - dateFormat: (string, defaults to *j M Y - H:i*) The format in which dates should be displayed
  - maxUploadSize: (integeter, defaults to *20280000* bytes) The maximum file size for upload in bytes
  - maxImageSize: (integeter, default is 1024) The maximum number of pixels an image can have, if the user enables "resize on upload"
  - upload: (boolean, defaults to *true*) allow uploads, this is also set in the FileManager.js (this here is only for security protection when uploads should be deactivated)
  - destroy: (boolean, defaults to *true*) allow files get deleted, this is also set in the FileManager.js (this here is only for security protection when uploads should be deactivated)
  - safe: (string, defaults to *true*) If true, disallows 'exe', 'dll', 'php', 'php3', 'php4', 'php5', 'phps'
  - chmod: (integeter, default is 0777) the permissions set to the uploaded files and created thumbnails (must have a leading "0", e.g. 0777)
*/

require_once(dirname(__FILE__) . '/Upload.php');
require_once(dirname(__FILE__) . '/Image.class.php');

class FileManager {
  
  protected $path = null;
  protected $length = null;
  protected $basedir = null;
  protected $basename = null;
  protected $options;
  protected $post;
  protected $get;
  protected $listType;
  
  public function __construct($options){
    $path = FileManagerUtility::getPath();
    
    $this->options = array_merge(array(
      'directory' => 'Files/',
      'assetBasePath' => '../',
      'thumbnailPath' => '../Thumbs/',
      'mimeTypesPath' => $path . '/MimeTypes.ini',
      'dateFormat' => 'j M Y - H:i',
      'maxUploadSize' => 2600 * 2600 * 3,
      'maxImageSize' => 1024,
      'upload' => true,
      'destroy' => true,
      'safe' => true,
      'chmod' => 0777,
    ), $options);
    
    $this->options['thumbnailPath'] = FileManagerUtility::getRealPath($this->options['thumbnailPath'],$this->options['chmod']);
    $this->options['assetBasePath'] = FileManagerUtility::getRealPath($this->options['assetBasePath'],$this->options['chmod']);
    $this->basedir = $_SERVER['DOCUMENT_ROOT'].FileManagerUtility::getRealPath($this->options['directory'],$this->options['chmod']);
    $this->basename = pathinfo($this->basedir, PATHINFO_BASENAME) . '/';
    $this->length = strlen($this->basedir);
    $this->listType = (isset($_POST['type']) && $_POST['type'] == 'list') ? 'list' : 'thumb';
    $this->filter = (isset($_POST['filter']) && !empty($_POST['filter'])) ? $_POST['filter'].'/' : '';

    header('Expires: Fri, 01 Jan 1990 00:00:00 GMT');
    header('Cache-Control: no-cache, no-store, max-age=0, must-revalidate');

    $this->get = $_GET;
    $this->post = $_POST;
  }
  
  public function fireEvent($event){
    $event = $event ? 'on' . ucfirst($event) : null;
    if (!$event || !method_exists($this, $event)) $event = 'onView';
    
    $this->{$event}();
  }
  
  protected function onView(){
    $dir = $this->getDir(!empty($this->post['directory']) ? $this->post['directory'] : null);
    $files = ($files = glob($dir . '/*')) ? $files : array();
    
    if ($dir != $this->basedir) array_unshift($files, $dir . '/..');
    natcasesort($files);
    foreach ($files as $file){
    
      $mime = $this->getMimeType($file);
      if ($this->filter && $mime != 'text/directory' && !FileManagerUtility::startsWith($mime, $this->filter))
        continue;
      
      if(strpos($mime,'image') !== false)
        $this->getThumb($this->normalize($file));

      
      $icon = ($this->listType == 'thumb' && strpos($mime,'image') !== false )
        ? $this->options['thumbnailPath'] . $this->getThumb($this->normalize($file))
        : $this->getIcon($this->normalize($file));
      
      // list files, except the thumbnail folder
      if(str_replace($_SERVER['DOCUMENT_ROOT'],'',$this->normalize($file)) != substr($this->options['thumbnailPath'],0,-1)) {
        $out[is_dir($file) ? 0 : 1][] = array(
          'path' => str_replace($_SERVER['DOCUMENT_ROOT'],'',$this->normalize($file)),
          'name' => pathinfo($file, PATHINFO_BASENAME),
          'date' => date($this->options['dateFormat'], filemtime($file)),
          'mime' => $this->getMimeType($file),
          'thumbnail' => $icon,
          'icon' => $this->getIcon($this->normalize($file),true),
          'size' => filesize($file)
        );
      }
    }
    echo json_encode(array(
        //'assetBasePath' => $this->options['assetBasePath'],
        'root' => substr(FileManagerUtility::getRealPath($this->options['directory'],$this->options['chmod']),1),
        'path' => $this->getPath($dir),
        'dir' => array(
        'name' => pathinfo($dir, PATHINFO_BASENAME),
        'date' => date($this->options['dateFormat'], filemtime($dir)),
        'mime' => 'text/directory',
        'thumbnail' => $this->getIcon($this->normalize($dir)),
        'icon' => $this->getIcon($this->normalize($dir),true)
      ),
      'files' => array_merge(!empty($out[0]) ? $out[0] : array(), !empty($out[1]) ? $out[1] : array())
    ));
  }
  
  protected function onDetail(){
    if (empty($this->post['file'])) return;
    
    $file = $this->basedir . $this->post['directory'] . $this->post['file'];
    
    if (!$this->checkFile($file)) return;
    
    $url = str_replace($_SERVER['DOCUMENT_ROOT'],'',$this->normalize($file));
    $mime = $this->getMimeType($file);
    $content = null;

    // image
    if (FileManagerUtility::startsWith($mime, 'image/')) {
      // generates a random number to put on the end of the image, to prevent caching
      $randomImage = '?'.md5(uniqid(rand(),1));
      $size = getimagesize($file);
      $content = '<dl>
          <dt>${width}</dt><dd>' . $size[0] . 'px</dd>
          <dt>${height}</dt><dd>' . $size[1] . 'px</dd>
        </dl>
        <h2>${preview}</h2>
        <a href="'.$url.'" data-milkbox="preview"><img src="' . $this->options['thumbnailPath'] . $this->getThumb($this->normalize($file)).$randomImage.'" class="preview" alt="preview" /></a>
        ';
    // text preview
    }elseif (FileManagerUtility::startsWith($mime, 'text/') || $mime == 'application/x-javascript') {
      $filecontent = file_get_contents($file, false, null, 0);
      if (!FileManagerUtility::isBinary($filecontent)) $content = '<div class="textpreview"><pre>' . str_replace(array('$', "\t"), array('&#36;', '&nbsp;&nbsp;'), htmlentities($filecontent,ENT_QUOTES,'UTF-8')) . '</pre></div>';
    // zip
    } elseif ($mime == 'application/zip') {
      require_once(dirname(__FILE__) . '/Assets/getid3/getid3.php');
      $out = array(array(), array());
      $getid3 = new getID3();
      $getid3->Analyze($file);
      foreach ($getid3->info['zip']['files'] as $name => $size){
        $dir = is_array($size) ? true : true;
        $out[($dir) ? 0 : 1][$name] = '<li><a><img src="'.$this->getIcon($name,true).'" alt="" /> ' . $name . '</a></li>';
      }
      natcasesort($out[0]);
      natcasesort($out[1]);
      $content = '<ul>' . implode(array_merge($out[0], $out[1])) . '</ul>';
    // swf
    } elseif ($mime == 'application/x-shockwave-flash') {
      require_once(dirname(__FILE__) . '/Assets/getid3/getid3.php');
      $getid3 = new getID3();
      $getid3->Analyze($file);
      
      $content = '<dl>
          <dt>${width}</dt><dd>' . $getid3->info['swf']['header']['frame_width']/10 . 'px</dd>
          <dt>${height}</dt><dd>' . $getid3->info['swf']['header']['frame_height']/10 . 'px</dd>
          <dt>${length}</dt><dd>' . round(($getid3->info['swf']['header']['length']/$getid3->info['swf']['header']['frame_count'])) . 's</dd>
        </dl>
        <h2>${preview}</h2>
        <div class="object">
          <object type="application/x-shockwave-flash" data="'.str_replace($_SERVER['DOCUMENT_ROOT'],'',$file).'" width="500" height="400">
            <param name="scale" value="noscale" />
            <param name="movie" value="'.str_replace($_SERVER['DOCUMENT_ROOT'],'',$file).'" />
          </object>
        </div>';
    // audio
    } elseif (FileManagerUtility::startsWith($mime, 'audio/')){
      require_once(dirname(__FILE__) . '/Assets/getid3/getid3.php');
      $getid3 = new getID3();
      $getid3->Analyze($file);
      getid3_lib::CopyTagsToComments($getid3->info); 
      
      $content = '<dl>
          <dt>${title}</dt><dd>' . $getid3->info['comments']['title'][0] . '</dd>
          <dt>${artist}</dt><dd>' . $getid3->info['comments']['artist'][0] . '</dd>
          <dt>${album}</dt><dd>' . $getid3->info['comments']['album'][0] . '</dd>
          <dt>${length}</dt><dd>' . $getid3->info['playtime_string'] . '</dd>
          <dt>${bitrate}</dt><dd>' . round($getid3->info['bitrate']/1000) . 'kbps</dd>
        </dl>
        <h2>${preview}</h2>
        <div class="object">
          <object type="application/x-shockwave-flash" data="' . $this->options['assetBasePath'] . '/dewplayer.swf" width="200" height="20" id="dewplayer" name="dewplayer">
            <param name="wmode" value="transparent" />
            <param name="movie" value="' . $this->options['assetBasePath'] . '/dewplayer.swf" />
            <param name="flashvars" value="mp3=' . rawurlencode($url) . '&amp;volume=50&amp;showtime=1" />
          </object>
        </div>';
    }
    
    echo json_encode(array(
      'content' => $content ? $content : '<div class="margin">
        ${nopreview}
      </div>'//<br/><button value="' . $url . '">${download}</button>
    ));
  }
  
  protected function onDestroy(){
    if (!$this->options['destroy'] || empty($this->post['file'])) return;
    
    $file = $this->basedir . $this->post['directory'] . $this->post['file'];
    if (!$this->checkFile($file)) return;
    
    $this->unlink($file);
    
    echo json_encode(array(
      'content' => 'destroyed'
    ));
  }
  
  protected function onCreate(){
    if (empty($this->post['file'])) return;
    
    $file = $this->getName($this->post['file'], $this->getDir($this->post['directory']));
    if (!$file) return;
    
    mkdir($file,$this->options['chmod']);
    
    $this->onView();
  }
  
  protected function onDownload() {
    if(strpos($_GET['file'],'../') !== false) return;
    if(strpos($_GET['file'],'./') !== false) return;
    $path = $this->basedir.$_GET['file']; // change the path to fit your websites document structure
    $path = preg_replace('#/+#','/',$path);
    if ($fd = fopen ($path, "r")) {
        $fsize = filesize($path);
        $path_parts = pathinfo($path);
        $ext = strtolower($path_parts["extension"]);
        switch ($ext) {
            case "pdf":
            header("Content-type: application/pdf"); // add here more headers for diff. extensions
            header("Content-Disposition: attachment; filename=\"".$path_parts["basename"]."\""); // use 'attachment' to force a download
            break;
            default;
            header("Content-type: application/octet-stream");
            header("Content-Disposition: filename=\"".$path_parts["basename"]."\"");
        }
        header("Content-length: $fsize");
        header("Cache-control: private"); //use this to open files directly
        
        fpassthru($fd);
        fclose ($fd);
    }
  }
  
  protected function onUpload(){
    try{
      if (!$this->options['upload'])
        throw new FileManagerException('disabled');
      if ((function_exists('UploadIsAuthenticated') && !UploadIsAuthenticated($this->get)))
        throw new FileManagerException('authenticated');
      
      $dir = $this->getDir($this->get['directory']);
      $name = pathinfo((Upload::exists('Filedata')) ? $this->getName($_FILES['Filedata']['name'], $dir) : null, PATHINFO_FILENAME);
      $file = Upload::move('Filedata', $dir , array(
        'name' => $name,
        'extension' => $this->options['safe'] && $name && in_array(strtolower(pathinfo($_FILES['Filedata']['name'], PATHINFO_EXTENSION)), array('exe', 'dll', 'php', 'php3', 'php4', 'php5', 'phps')) ? 'txt' : null,
        'size' => $this->options['maxUploadSize'],
        'mimes' => $this->getAllowedMimeTypes(),
        'chmod' => $this->options['chmod']
      ));
      
      if (FileManagerUtility::startsWith(Upload::mime($file), 'image/') && !empty($this->get['resize'])){
        $img = new Image($file);
        $size = $img->getSize();
        if ($size['width'] > $this->options['maxImageSize']) $img->resize($this->options['maxImageSize'])->save();
        elseif ($size['height'] > $this->options['maxImageSize']) $img->resize(null, $this->options['maxImageSize'])->save();
        unset($img);
      }
      
      echo json_encode(array(
        'status' => 1,
        'name' => pathinfo($file, PATHINFO_BASENAME)
      ));
    }catch(UploadException $e){
      echo json_encode(array(
        'status' => 0,
        'error' => class_exists('ValidatorException') ? strip_tags($e->getMessage()) : '${upload.' . $e->getMessage() . '}' // This is for Styx :)
      ));
    }catch(FileManagerException $e){
      echo json_encode(array(
        'status' => 0,
        'error' => '${upload.' . $e->getMessage() . '}'
      ));
    }
  }
  
  /* This method is used by both move and rename */
  protected function onMove(){
    if (empty($this->post['file'])) return;
    
    $rename = empty($this->post['newDirectory']) && !empty($this->post['name']);
    $dir = $this->getDir($this->post['directory']);
    $file = $dir . $this->post['file'];
    
    $is_dir = is_dir($file);
    if (!$this->checkFile($file) || (!$rename && $is_dir))
      return;
    
    if($rename || $is_dir){
      if (empty($this->post['name'])) return;
      $newname = $this->getName($this->post['name'], $dir);
      $fn = 'rename';
      if(!$is_dir && file_exists($_SERVER['DOCUMENT_ROOT'].$this->options['thumbnailPath'].$this->generateThumbName($file)))
        unlink($_SERVER['DOCUMENT_ROOT'].$this->options['thumbnailPath'].$this->generateThumbName($file));
    } else {
      $newname = $this->getName(pathinfo($file, PATHINFO_FILENAME), $this->getDir($this->post['newDirectory']));
      $fn = !empty($this->post['copy']) ? 'copy' : 'rename';
    }
    
    if (!$newname) return;
    
    $extOld = pathinfo($file, PATHINFO_EXTENSION);
    $extNew = pathinfo($newname, PATHINFO_EXTENSION);
    if ($extOld != $extNew) $newname .= '.' . $extOld;
    $fn($file, $newname);
    
    echo json_encode(array(
      'name' => pathinfo($this->normalize($newname), PATHINFO_BASENAME),
    ));
  }
  
  protected function unlink($file) {
    
    if ($this->basedir==$file || strlen($this->basedir)>=strlen($file))
      return;
    
    if(is_dir($file)){
      $files = glob($file . '/*');
      if (is_array($files))
        foreach ($files as $f) {
          $this->unlink($f);
          $this->deleteThumb($f);
        }
        
      @rmdir($file);
    }else{
      try{ if ($this->checkFile($file)) {unlink($file); $this->deleteThumb($file);} }catch(Exception $e){}
    }
  }
  
  protected function getName($file, $dir){
    $files = array();
    foreach ((array)glob($dir . '/*') as $f)
      $files[] = pathinfo($f, PATHINFO_FILENAME);
    
    $pathinfo = pathinfo($file);
    $file = $dir . FileManagerUtility::pagetitle($pathinfo['filename'], $files).(!empty($pathinfo['extension']) ? '.' . $pathinfo['extension'] : null);
    
    return !$file || !FileManagerUtility::startsWith($file, $this->basedir) || file_exists($file) ? null : $file;
  }
  
  protected function getIcon($file,$smallIcon = false){
     
    if (FileManagerUtility::endsWith($file, '/..')) $ext = 'dir_up';
    elseif (is_dir($file)) $ext = 'dir';
    else $ext = pathinfo($file, PATHINFO_EXTENSION);
    
    $largeDir = ($smallIcon === false && $this->listType == 'thumb') ? 'Large/' : '';
    $path = (is_file($_SERVER['DOCUMENT_ROOT'].$this->options['assetBasePath'] . 'Images/Icons/'.$largeDir.$ext.'.png'))
      ? $this->options['assetBasePath'] . 'Images/Icons/'.$largeDir.$ext.'.png'
      : $this->options['assetBasePath'] . 'Images/Icons/'.$largeDir.'default.png';
    
    return $path;
  }

  protected function getThumb($file)
  {
    $thumb = $this->generateThumbName($file);
    $thumbPath = $_SERVER['DOCUMENT_ROOT'].$this->options['thumbnailPath'] . $thumb;
    if (is_file($thumbPath))
      return $thumb;
    elseif(is_file($_SERVER['DOCUMENT_ROOT'].$this->options['thumbnailPath'].basename($file)))
      return basename($file);
    else
      return $this->generateThumb($file,$thumbPath);
  }
  
  protected function generateThumbName($file) {
    return 'thumb_'.str_replace('.','_',basename($file)).'.png';
  }

  protected function generateThumb($file,$thumbPath)
  { 
    $img = new Image($file);
    $size = $img->resize(250,250,true,false);
    $img->process('png',$thumbPath);
    unset($img);
    return basename($thumbPath);
  }
  protected function deleteThumb($file)
  {
    $thumb = $this->generateThumbName($file);
    $thumbPath = $_SERVER['DOCUMENT_ROOT'].$this->options['thumbnailPath'] . $thumb;
    if(is_file($thumbPath))
      @unlink($thumbPath);
  }

  protected function getMimeType($file){
    return is_dir($file) ? 'text/directory' : Upload::mime($file);
  }
  
  protected function getDir($dir){  
    $dir = $_SERVER['DOCUMENT_ROOT'].FileManagerUtility::getRealPath($this->options['directory'].'/'.$dir,$this->options['chmod']);
    return $this->checkFile($dir) ? $dir : $this->basedir;
  }
  
  protected function getPath($file){
    $file = $this->normalize(substr($file, $this->length));
    return $file;
  }
  
  protected function checkFile($file){
    $mimes = $this->getAllowedMimeTypes();

    $hasFilter = $this->filter && count($mimes);
    if ($hasFilter) array_push($mimes, 'text/directory');
    return !(!$file || !FileManagerUtility::startsWith($file, $this->basedir) || !file_exists($file) || ($hasFilter && !in_array($this->getMimeType($file), $mimes)));
  }
  
  protected function normalize($file){
    return preg_replace('/\\\|\/{2,}/', '/', $file);
  }
  
  protected function getAllowedMimeTypes(){
    $filter = $this->filter;
    $mimeTypes = array();
    
    if (!$filter) return null;
    if (!FileManagerUtility::endsWith($filter, '/')) return array($filter);
    
    static $mimes;
    if (!$mimes) $mimes = parse_ini_file($this->options['mimeTypesPath']);
    
    foreach ($mimes as $mime)
      if (FileManagerUtility::startsWith($mime, $filter))
        $mimeTypes[] = strtolower($mime);
    
    return $mimeTypes;
  }

}

class FileManagerException extends Exception {}

/* Stripped-down version of some Styx PHP Framework-Functionality bundled with this FileBrowser. Styx is located at: http://styx.og5.net */
class FileManagerUtility {
  
  public static function endsWith($string, $look){
    return strrpos($string, $look)===strlen($string)-strlen($look);
  }
  
  public static function startsWith($string, $look){
    return strpos($string, $look)===0;
  }
  
  public static function pagetitle($data, $options = array()){
    static $regex;
    if (!$regex){
      $regex = array(
        explode(' ', 'Æ æ Œ œ ß Ü ü Ö ö Ä ä À Á Â Ã Ä Å &#260; &#258; Ç &#262; &#268; &#270; &#272; Ð È É Ê Ë &#280; &#282; &#286; Ì Í Î Ï &#304; &#321; &#317; &#313; Ñ &#323; &#327; Ò Ó Ô Õ Ö Ø &#336; &#340; &#344; Š &#346; &#350; &#356; &#354; Ù Ú Û Ü &#366; &#368; Ý Ž &#377; &#379; à á â ã ä å &#261; &#259; ç &#263; &#269; &#271; &#273; è é ê ë &#281; &#283; &#287; ì í î ï &#305; &#322; &#318; &#314; ñ &#324; &#328; ð ò ó ô õ ö ø &#337; &#341; &#345; &#347; š &#351; &#357; &#355; ù ú û ü &#367; &#369; ý ÿ ž &#378; &#380;'),
        explode(' ', 'Ae ae Oe oe ss Ue ue Oe oe Ae ae A A A A A A A A C C C D D D E E E E E E G I I I I I L L L N N N O O O O O O O R R S S S T T U U U U U U Y Z Z Z a a a a a a a a c c c d d e e e e e e g i i i i i l l l n n n o o o o o o o o r r s s s t t u u u u u u y y z z z'),
      );
    }
    
    $data = trim(substr(preg_replace('/(?:[^A-z0-9]|_|\^)+/i', '_', str_replace($regex[0], $regex[1], $data)), 0, 64), '_');
    return !empty($options) ? self::checkTitle($data, $options) : $data;
  }
  
  protected static function checkTitle($data, $options = array(), $i = 0){
    if (!is_array($options)) return $data;
    
    foreach ($options as $content)
      if ($content && strtolower($content) == strtolower($data.($i ? '_' . $i : '')))
        return self::checkTitle($data, $options, ++$i);
    
    return $data.($i ? '_' . $i : '');
  }
  
  public static function isBinary($str){
    $array = array(0, 255);
    for($i = 0; $i < strlen($str); $i++)
      if (in_array(ord($str[$i]), $array)) return true;
    
    return false;
  }
  
  public static function getPath(){
    static $path;
    return $path ? $path : $path = pathinfo(__FILE__, PATHINFO_DIRNAME);
  }
  
  public static function getRealPath($path,$chmod = 0777) {
    
    $path = str_replace('\\','/',$path);
    $path = preg_replace('#/+#','/',$path);
    $path = str_replace($_SERVER['DOCUMENT_ROOT'],'',$path);
    
    if(!FileManagerUtility::startsWith($path,'../') && !FileManagerUtility::startsWith($path,'/') && !is_dir($path) && is_dir(dirname($path))) @mkdir($path,$chmod); // create folder if not existing before, to prevent failure in realPath() function
    $path = (FileManagerUtility::startsWith($path,'/')) ? $_SERVER['DOCUMENT_ROOT'].$path : $path;
    if(!is_dir($path) && is_dir(dirname($path))) @mkdir($path,$chmod); // create folder if not existing
    $path = (FileManagerUtility::startsWith($path,'../') || !FileManagerUtility::startsWith($path,'/')) ? realPath($path) : $path;
    $path = str_replace('\\','/',$path);    
    $path = str_replace($_SERVER['DOCUMENT_ROOT'],'',$path);
    $path = (FileManagerUtility::endsWith($path,'/')) ? $path : $path.'/';
    
    return $path;
  }
  
}