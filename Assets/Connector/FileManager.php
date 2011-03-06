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
  - directory: (string) The base directory to be used for the FileManager
  - assetBasePath: (string, optional) The path to all images and swf files used by the filemanager
  - thumbnailPath: (string) The path where the thumbnails of the pictures will be saved
  - mimeTypesPath: (string, optional) The path to the MimeTypes.ini file.
  - dateFormat: (string, defaults to *j M Y - H:i*) The format in which dates should be displayed
  - maxUploadSize: (integer, defaults to *20280000* bytes) The maximum file size for upload in bytes
  - maxImageSize: (integer, default is 1024) The maximum number of pixels an image can have, if the user enables "resize on upload"
  - upload: (boolean, defaults to *true*) allow uploads, this is also set in the FileManager.js (this here is only for security protection when uploads should be deactivated)
  - destroy: (boolean, defaults to *true*) allow files to get deleted, this is also set in the FileManager.js (this here is only for security protection when file/directory delete operations should be deactivated)
  - safe: (string, defaults to *true*) If true, disallows 'exe', 'dll', 'php', 'php3', 'php4', 'php5', 'phps' and saves them as 'txt' instead.
  - chmod: (integer, default is 0777) the permissions set to the uploaded files and created thumbnails (must have a leading "0", e.g. 0777)

Notes on relative paths and safety / security:
  If any option is specifying a relative path, e.g. '../Assets' or 'Media/Stuff/', this is assumed to be relative to the URI request path,
  i.e. dirname($_SERVER['SCRIPT_NAME']).

  Formerly, the relative paths were taken relative to this script itself (dirname(__FILE__)), but that can be counter-intuitive for more complex
  rigs where FileManager is included in other PHP scripts positioned elsewhere in the directory tree.

  We also assume that any of the paths may be specified from the outside, so each path is processed and filtered to prevent malicious intent
  from succeeding. (An example of such would be an attacker posting his own 'destroy' event request requesting the destruction of
  '../../../../../../../../../etc/passwd' for example. In more complex rigs, the attack may be assisted through attacks at these options' paths,
  so these are subjected to the same scrutiny in here.)

  All paths, absolute or relative, are ENFORCED TO ABIDE THE RULE 'every path resides within the DocumentRoot tree' without exception. When
  paths apparently don't, they are forcibly coerced into adherence to this rule. Because we can do without exceptions to important rules. ;-)
*/

if (version_compare(PHP_VERSION, '5.2.0') < 0)
{
    die('FileManager requires PHP 5.2.0 or later');
}

if (!defined('MTFM_PATH'))
{
    $base = str_replace('\\','/',dirname(__FILE__));
    define('MTFM_PATH', $base);
}

require_once(MTFM_PATH . '/Upload.php');
require_once(MTFM_PATH . '/Image.class.php');

class FileManager {

  protected $path = null;
  protected $length = null;
  protected $basedir = null;                    // absolute path equivalent, filesystem-wise, for options['directory']
  protected $basename = null;
  protected $options;
  protected $post;
  protected $get;
  protected $listType;

  public function __construct($options)
  {
    $this->options = array_merge(array(
      /*
       * Note that all default paths as listed below are transformed to DocumentRoot-based paths 
       * through the getRealPath() invocations further below:
       */
      'directory' => MTFM_PATH . '/Files/',
      'assetBasePath' => MTFM_PATH . '/../../Assets/',
      'thumbnailPath' => MTFM_PATH . '/../../Assets/Thumbs/',  // written like this so we're completely clear on where the default thumbnails directory will be
      'mimeTypesPath' => MTFM_PATH . '/MimeTypes.ini',
      'dateFormat' => 'j M Y - H:i',
      'maxUploadSize' => 2600 * 2600 * 3,
      'maxImageSize' => 1024,
      'upload' => true,
      'destroy' => true,
      'create' => true,
      'move' => true,
      'download' => true,
      /* ^^^ this last one is easily circumnavigated if it's about images: when you can view 'em, you can 'download' them anyway.
       *     However, for other mime types which are not previewable / viewable 'in their full bluntal nugity' ;-) , this will
       *     be a strong deterent.
       *
       *     Think Springer Verlag and PDFs, for instance. You can have 'em, but only /after/ you've ...
       */
      'safe' => true,
      'chmod' => 0777
    ), (is_array($options) ? $options : array()));

    $this->options['thumbnailPath'] = FileManagerUtility::getRealPath($this->options['thumbnailPath'], $this->options['chmod'], true); // create path if nonexistent
    $this->options['assetBasePath'] = FileManagerUtility::getRealPath($this->options['assetBasePath']);
    $this->options['mimeTypesPath'] = FileManagerUtility::getSiteRoot() . FileManagerUtility::getRealPath($this->options['mimeTypesPath'], 0, false, false); // filespec, not a dirspec!
    $this->options['directory'] = FileManagerUtility::getRealPath($this->options['directory']);
    $this->basedir = FileManagerUtility::getSiteRoot() . $this->options['directory'];
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

  /**
   * @return array the FileManager options and settings.
   */
  public function getSettings(){
    return array_merge(array(
        'basedir' => $this->basedir,
        'basename' => $this->basename,
        'listType' => $this->listType,
        'filter' => $this->filter,
    ), $this->options);
  }

  protected function _onView($dir, $json = null)
  {
    $files = ($files = glob($dir . '*')) ? $files : array();

    if ($dir != $this->basedir) array_unshift($files, $dir . '..');
    natcasesort($files);
    foreach ($files as $file)
    {
      $file = $this->normalize($file);
      $url = str_replace(FileManagerUtility::getSiteRoot(),'',$this->normalize($file));

      $mime = $this->getMimeType($file);
      if ($this->filter && $mime != 'text/directory' && !FileManagerUtility::startsWith($mime, $this->filter))
        continue;

      /*
       * each image we inspect may throw an exception due to a out of memory warning
       * (which is far better than without those: a silent fatal abort!)
       *
       * However, now that we do have a way to check most memory failures occurring in here (due to large images
       * and too little available RAM) we /still/ want a directory view; we just want to skip/ignore/mark those
       * overly large ones.
       */
      $thumb = false;
      try
      {
        // access the image and create a thumbnail image; this can fail dramatically
        if(strpos($mime,'image') !== false)
          $thumb = $this->getThumb($file);
      }
      catch (Exception $e)
      {
         // do nothing, except mark image as 'not suitable for thumbnailing'
      }

      $icon = ($this->listType == 'thumb' && $thumb)
        ? $this->options['thumbnailPath'] . $thumb
        : $this->getIcon($file); // TODO: add extra icons for those bad format and superlarge images with make us b0rk?

      // list files, except the thumbnail folder
      if($url != substr($this->options['thumbnailPath'],0,-1)) {
        $out[is_dir($file) ? 0 : 1][] = array(
          'path' => FileManagerUtility::rawurlencode_path($url),
          'name' => pathinfo($file, PATHINFO_BASENAME),
          'date' => date($this->options['dateFormat'], filemtime($file)),
          'mime' => $mime,
          'thumbnail' => FileManagerUtility::rawurlencode_path($icon),
          'icon' => FileManagerUtility::rawurlencode_path($this->getIcon($file,true)),
          'size' => filesize($file)
        );
      }
    }
    return array_merge((is_array($json) ? $json : array()), array(
        //'assetBasePath' => $this->options['assetBasePath'],
        //'thumbnailPath' => $this->options['thumbnailPath'],
        //'ia_directory' => $this->options['directory'],
        //'ia_dir' => $dir,
        'root' => substr($this->options['directory'], 1),
        'path' => $this->getPath($dir),
        'dir' => array(
            'name' => pathinfo($dir, PATHINFO_BASENAME),
            'date' => date($this->options['dateFormat'], filemtime($dir)),
            'mime' => 'text/directory',
            'thumbnail' => $this->getIcon($dir),
            'icon' => $this->getIcon($dir,true)
          ),
      'files' => array_merge(!empty($out[0]) ? $out[0] : array(), !empty($out[1]) ? $out[1] : array())
    ));
  }

  protected function onView()
  {
    try
    {
        $dir = $this->getDir(!empty($this->post['directory']) ? $this->post['directory'] : null);
        $rv = $this->_onView($dir);
        echo json_encode($rv);
    }
    catch(FileManagerException $e)
    {
        $emsg = explode(':', $e->getMessage(), 2);
        $jserr = array(
                'status' => 0,
                'error' => '${upload.' . $emsg[0] . '}' . (isset($emsg[1]) ? $emsg[1] : '')
            );
        // and fall back to showing the root directory
        try
        {
            $dir = $this->getDir();
            $rv = $this->_onView($dir, $jserr);
            echo json_encode($rv);
        }
        catch (Exception $e)
        {
            // when we fail here, it's pretty darn bad and nothing to it.
            // just push the error JSON as go.
            echo json_encode($jserr);
        }
    }
    catch(Exception $e)
    {
        // catching other severe failures; since this can be anything and should only happen in the direst of circumstances, we don't bother translating
        $jserr = array(
                'status' => 0,
                'error' => $e->getMessage()
            );
        // and fall back to showing the root directory
        try
        {
            $dir = $this->getDir();
            $rv = $this->_onView($dir, $jserr);
            echo json_encode($rv);
        }
        catch (Exception $e)
        {
            // when we fail here, it's pretty darn bad and nothing to it.
            // just push the error JSON as go.
            echo json_encode($jserr);
        }
    }
  }

  protected function onDetail()
  {
  try
  {
    if (empty($this->post['file'])) return;

    $url = FileManagerUtility::getRealPath($this->basedir . $this->post['directory'] . $this->post['file'], 0, false, false);
    $file = FileManagerUtility::getSiteRoot() . $url;

    if (!$this->checkFile($file)) return;

    $url_fname = pathinfo($url, PATHINFO_BASENAME);

    // spare the '/' dir separators from URL encoding:
    $encoded_url = FileManagerUtility::rawurlencode_path($url);

    $mime = $this->getMimeType($file);
    $content = null;

    // image
    if (FileManagerUtility::startsWith($mime, 'image/')) {
      // generates a random number to put on the end of the image, to prevent caching
      $randomImage = '?'.md5(uniqid(rand(),1));
      $size = @getimagesize($file);
      // check for badly formatted image files (corruption); we'll handle the overly large ones next
      if (!$size) throw new FileManagerException('corrupt_img');
      $thumbfile = $this->options['thumbnailPath'] . $this->getThumb($file);
      try
      {
          $content = '<dl>
              <dt>${width}</dt><dd>' . $size[0] . 'px</dd>
              <dt>${height}</dt><dd>' . $size[1] . 'px</dd>
              <dt>mem usage:</dt><dd>' . number_format(memory_get_usage() / 1E6, 2) . ' MB : ' . number_format(memory_get_peak_usage() / 1E6, 2) . ' MB</dd>
            </dl>
            <h2>${preview}</h2>
            <a href="'.$encoded_url.'" data-milkbox="preview" title="'.htmlentities($url_fname, ENT_QUOTES, 'UTF-8').'"><img src="' . FileManagerUtility::rawurlencode_path($thumbfile) . $randomImage . '" class="preview" alt="preview" /></a>
            ';
      }
      catch (Exception $e)
      {
          $content = '<dl>
              <dt>${width}</dt><dd>' . $size[0] . 'px</dd>
              <dt>${height}</dt><dd>' . $size[1] . 'px</dd>
              <dt>mem usage:</dt><dd>' . number_format(memory_get_usage() / 1E6, 2) . ' MB : ' . number_format(memory_get_peak_usage() / 1E6, 2) . ' MB</dd>
            </dl>
            <h2>${preview}</h2>
            <a href="'.$encoded_url.'" data-milkbox="preview" title="'.htmlentities($url_fname, ENT_QUOTES, 'UTF-8').'"><img src="' . FileManagerUtility::rawurlencode_path($this->getIcon($file)).$randomImage . '" class="preview" alt="preview" /></a>
            ';
      }
    // text preview
    }elseif (FileManagerUtility::startsWith($mime, 'text/') || $mime == 'application/x-javascript') {
      $filecontent = file_get_contents($file, false, null, 0);
      if (!FileManagerUtility::isBinary($filecontent)) $content = '<div class="textpreview"><pre>' . str_replace(array('$', "\t"), array('&#36;', '&nbsp;&nbsp;'), htmlentities($filecontent,ENT_QUOTES,'UTF-8')) . '</pre></div>';
    // zip
    } elseif ($mime == 'application/zip') {
      require_once(MTFM_PATH . '/Assets/getid3/getid3.php');
      $out = array(array(), array());
      $getid3 = new getID3();
      $getid3->Analyze($file);
      foreach ($getid3->info['zip']['files'] as $name => $size){
        $dir = is_array($size) ? true : true;
        $out[($dir) ? 0 : 1][$name] = '<li><a><img src="'.FileManagerUtility::rawurlencode_path($this->getIcon($name,true)).'" alt="" /> ' . $name . '</a></li>';
      }
      natcasesort($out[0]);
      natcasesort($out[1]);
      $content = '<ul>' . implode(array_merge($out[0], $out[1])) . '</ul>';
    // swf
    } elseif ($mime == 'application/x-shockwave-flash') {
      require_once(MTFM_PATH . '/Assets/getid3/getid3.php');
      $getid3 = new getID3();
      $getid3->Analyze($file);

      $content = '<dl>
          <dt>${width}</dt><dd>' . $getid3->info['swf']['header']['frame_width']/10 . 'px</dd>
          <dt>${height}</dt><dd>' . $getid3->info['swf']['header']['frame_height']/10 . 'px</dd>
          <dt>${length}</dt><dd>' . round(($getid3->info['swf']['header']['length']/$getid3->info['swf']['header']['frame_count'])) . 's</dd>
        </dl>
        <h2>${preview}</h2>
        <div class="object">
          <object type="application/x-shockwave-flash" data="'.FileManagerUtility::rawurlencode_path($url).'" width="500" height="400">
            <param name="scale" value="noscale" />
            <param name="movie" value="'.FileManagerUtility::rawurlencode_path($url).'" />
          </object>
        </div>';
    // audio
    } elseif (FileManagerUtility::startsWith($mime, 'audio/')){
      require_once(MTFM_PATH . '/Assets/getid3/getid3.php');
      $getid3 = new getID3();
      $getid3->Analyze($file);
      getid3_lib::CopyTagsToComments($getid3->info);

      $dewplayer = FileManagerUtility::rawurlencode_path($this->options['assetBasePath'] . 'dewplayer.swf');
      $content = '<dl>
          <dt>${title}</dt><dd>' . $getid3->info['comments']['title'][0] . '</dd>
          <dt>${artist}</dt><dd>' . $getid3->info['comments']['artist'][0] . '</dd>
          <dt>${album}</dt><dd>' . $getid3->info['comments']['album'][0] . '</dd>
          <dt>${length}</dt><dd>' . $getid3->info['playtime_string'] . '</dd>
          <dt>${bitrate}</dt><dd>' . round($getid3->info['bitrate']/1000) . 'kbps</dd>
        </dl>
        <h2>${preview}</h2>
        <div class="object">
          <object type="application/x-shockwave-flash" data="' . $dewplayer . '" width="200" height="20" id="dewplayer" name="dewplayer">
            <param name="wmode" value="transparent" />
            <param name="movie" value="' . $dewplayer . '" />
            <param name="flashvars" value="mp3=' . FileManagerUtility::rawurlencode_path($url) . '&amp;volume=50&amp;showtime=1" />
          </object>
        </div>';
    }

    echo json_encode(array(
      'status' => 1,
      'content' => $content ? $content : '<div class="margin">
        ${nopreview}
      </div>'//<br/><button value="' . $url . '">${download}</button>
    ));
    }
    catch(FileManagerException $e)
    {
        $emsg = explode(':', $e->getMessage(), 2);
        echo json_encode(array(
                'status' => 0,
                'content' => '<div class="margin">
                  ${nopreview}
                  <div class="failure_notice">
                    <h3>${error}</h3>
                    <p>mem usage: ' . number_format(memory_get_usage() / 1E6, 2) . ' MB : ' . number_format(memory_get_peak_usage() / 1E6, 2) . ' MB</p>
                    <p>${upload.' . $emsg[0] . '}' . (isset($emsg[1]) ? $emsg[1] : '') . '</p>
                  </div>
                </div>'       // <br/><button value="' . $url . '">${download}</button>
            ));
    }
    catch(Exception $e)
    {
        // catching other severe failures; since this can be anything and should only happen in the direst of circumstances, we don't bother translating
        echo json_encode(array(
                'status' => 0,
                'content' => '<div class="margin">
                  ${nopreview}
                  <div class="failure_notice">
                    <h3>${error}</h3>
                    <p>mem usage: ' . number_format(memory_get_usage() / 1E6, 2) . ' MB : ' . number_format(memory_get_peak_usage() / 1E6, 2) . ' MB</p>
                    <p>' . $e->getMessage() . '</p>
                  </div>
                </div>'       // <br/><button value="' . $url . '">${download}</button>
            ));
    }
  }

  protected function onDestroy()
  {
    try
    {
        if (!$this->options['destroy'])
            throw new FileManagerException('disabled');
        if (empty($this->post['file']))
            throw new FileManagerException('nofile');

        $dir = $this->getDir($this->post['directory']);
        $file = $dir . $this->post['file'];

        $name = pathinfo($file, PATHINFO_FILENAME);
        $fileinfo = array(
            'dir' => $dir,
            'file' => $file,
            'name' => $name
        );
        if (!empty($this->options['DestroyIsAuthenticated_cb']) && function_exists($this->options['DestroyIsAuthenticated_cb']) && !$this->options['DestroyIsAuthenticated_cb']($this, 'destroy', $fileinfo))
            throw new FileManagerException('authenticated');

        if (!$this->checkFile($file))
            throw new FileManagerException('nofile');

        $this->unlink($file);

        echo json_encode(array(
          'content' => 'destroyed'
        ));
    }
    catch(FileManagerException $e)
    {
        $emsg = explode(':', $e->getMessage(), 2);
        echo json_encode(array(
                'status' => 0,
                'error' => '${upload.' . $emsg[0] . '}' . (isset($emsg[1]) ? $emsg[1] : '')
            ));
    }
    catch(Exception $e)
    {
        // catching other severe failures; since this can be anything and should only happen in the direst of circumstances, we don't bother translating
        echo json_encode(array(
                'status' => 0,
                'error' => $e->getMessage()
            ));
    }
  }

  protected function onCreate()
  {
    try
    {
        if (!$this->options['create'])
            throw new FileManagerException('disabled');
        if (empty($this->post['file']))
            throw new FileManagerException('nofile');

        $dir = $this->getDir($this->post['directory']);
        $file = $this->getName($this->post['file'], $dir);
        if (!$file)
            throw new FileManagerException('nofile');

        $name = pathinfo($file, PATHINFO_FILENAME);
        $fileinfo = array(
            'dir' => $dir,
            'file' => $file,
            'name' => $name,
            'chmod' => $this->options['chmod']
        );
        if (!empty($this->options['CreateIsAuthenticated_cb']) && function_exists($this->options['CreateIsAuthenticated_cb']) && !$this->options['CreateIsAuthenticated_cb']($this, 'create', $fileinfo))
            throw new FileManagerException('authenticated');

        if (!@mkdir($file, $fileinfo['chmod']))
            throw new FileManagerException('nofile');

        $this->onView();
    }
    catch(FileManagerException $e)
    {
        $emsg = explode(':', $e->getMessage(), 2);
        echo json_encode(array(
                'status' => 0,
                'error' => '${upload.' . $emsg[0] . '}' . (isset($emsg[1]) ? $emsg[1] : '')
            ));
    }
    catch(Exception $e)
    {
        // catching other severe failures; since this can be anything and should only happen in the direst of circumstances, we don't bother translating
        echo json_encode(array(
                'status' => 0,
                'error' => $e->getMessage()
            ));
    }
  }

  protected function onDownload() {
    try
    {
        if (!$this->options['download'])
            throw new FileManagerException('disabled');
        if (empty($_GET['file']))
            throw new FileManagerException('nofile');
        if(strpos($_GET['file'],'../') !== false)
            throw new FileManagerException('nofile');
        if(strpos($_GET['file'],'./') !== false)
            throw new FileManagerException('nofile');

        $path = $this->basedir . $_GET['file']; // change the path to fit your websites document structure
        $path = FileManagerUtility::getSiteRoot() . FileManagerUtility::getRealPath($path, 0, false, false);
        if (!file_exists($path))
            throw new FileManagerException('nofile');

        $name = pathinfo($path, PATHINFO_FILENAME);
        $fileinfo = array(
            'file' => $path,
            'name' => $name
        );
        if (!empty($this->options['DownloadIsAuthenticated_cb']) && function_exists($this->options['DownloadIsAuthenticated_cb']) && !$this->options['DownloadIsAuthenticated_cb']($this, 'download', $fileinfo))
            throw new FileManagerException('authenticated');

        if ($fd = fopen($path, "r"))
        {
            $fsize = filesize($path);
            $path_parts = pathinfo($path);
            $ext = strtolower($path_parts["extension"]);
            switch ($ext)
            {
            case "pdf":
                header('Content-type: application/pdf'); // add here more headers for diff. extensions
                header('Content-Disposition: attachment; filename="' . $path_parts["basename"] . '"'); // use 'attachment' to force a download
                break;

            default;
                header('Content-type: application/octet-stream');
                header('Content-Disposition: filename="' . $path_parts["basename"] . '"');
            }
            header("Content-length: $fsize");
            header("Cache-control: private"); //use this to open files directly

            fpassthru($fd);
            fclose($fd);
        }
    }
    catch(FileManagerException $e)
    {
        // we don't care whether it's a 404, a 403 or something else entirely: we feed 'em a 403 and that's final!
        if (function_exists('send_response_status_header'))
        {
            send_response_status_header(403);
        }
        else
        {
            // no smarties detection whether we're running on fcgi or bare iron, we assume the latter:
            header('HTTP/1.0 403 Forbidden', true, 403);
        }
    }
    catch(Exception $e)
    {
        // we don't care whether it's a 404, a 403 or something else entirely: we feed 'em a 403 and that's final!
        if (function_exists('send_response_status_header'))
        {
            send_response_status_header(403);
        }
        else
        {
            // no smarties detection whether we're running on fcgi or bare iron, we assume the latter:
            header('HTTP/1.0 403 Forbidden', true, 403);
        }
    }
  }

  protected function onUpload(){
    try{
      if (!$this->options['upload'])
        throw new FileManagerException('disabled');
      if (!Upload::exists('Filedata'))
        throw new FileManagerException('nofile');

      $dir = $this->getDir($this->get['directory']);
      $name = pathinfo($this->getName($_FILES['Filedata']['name'], $dir), PATHINFO_FILENAME);
      $fileinfo = array(
        'dir' => $dir,
        'name' => $name,
        'extension' => $this->options['safe'] && $name && in_array(strtolower(pathinfo($_FILES['Filedata']['name'], PATHINFO_EXTENSION)), array('exe', 'dll', 'php', 'php3', 'php4', 'php5', 'phps')) ? 'txt' : null,
        'size' => $this->options['maxUploadSize'],
        'mimes' => $this->getAllowedMimeTypes(),
        'ext2mime_map' => $this->getMimeTypeDefinitions(),
        'chmod' => $this->options['chmod']
      );
      if (!empty($this->options['UploadIsAuthenticated_cb']) && function_exists($this->options['UploadIsAuthenticated_cb']) && !$this->options['UploadIsAuthenticated_cb']($this, 'upload', $fileinfo))
        throw new FileManagerException('authenticated');

      $file = Upload::move('Filedata', $dir, $fileinfo);

      /*
       * NOTE: you /can/ (and should be able to, IMHO) upload 'overly large' image files to your site, but the thumbnailing process step
       *       happening here will fail; we have memory usage estimators in place to make the fatal crash a non-silent one, i,e, one
       *       where we still have a very high probability of NOT fatally crashing the PHP iunterpreter but catching a suitable exception
       *       instead.
       *       Having uploaded such huge images, a developer/somebody can always go in later and up the memory limit if the site admins
       *       feel it is deserved. Until then, no thumbnails of such images (though you /should/ be able to milkbox-view the real thing!)
       */
      if (FileManagerUtility::startsWith($this->getMimeType($file), 'image/') && !empty($this->get['resize'])){
        $img = new Image($file);
        $size = $img->getSize();
        // Image::resize() takes care to maintain the proper aspect ratio, so this is easy:
        if ($size['width'] > $this->options['maxImageSize'] || $size['height'] > $this->options['maxImageSize'])
          $img->resize($this->options['maxImageSize'], $this->options['maxImageSize'])->save();
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
        $emsg = explode(':', $e->getMessage(), 2);
        echo json_encode(array(
                'status' => 0,
                'error' => '${upload.' . $emsg[0] . '}' . (isset($emsg[1]) ? $emsg[1] : '')
            ));
    }catch(Exception $e){
      // catching other severe failures; since this can be anything and should only happen in the direst of circumstances, we don't bother translating
      echo json_encode(array(
        'status' => 0,
        'error' => $e->getMessage()
      ));
    }
  }

  /* This method is used by both move and rename */
  protected function onMove()
  {
    try
    {
        if (!$this->options['move'])
            throw new FileManagerException('disabled');
        if (empty($this->post['file']))
            throw new FileManagerException('nofile');

        $rename = empty($this->post['newDirectory']) && !empty($this->post['name']);
        $dir = $this->getDir($this->post['directory']);
        $file = $dir . $this->post['file'];

        $is_dir = is_dir($file);
        $fn = !empty($this->post['copy']) ? 'copy' : 'rename';

        $name = pathinfo($file, PATHINFO_FILENAME);
        $fileinfo = array(
            'dir' => $dir,
            'file' => $file,
            'name' => $name,
            'newdir' => (!empty($this->post['newDirectory']) ? $this->post['newDirectory'] : '(null)'),
            'newname' => (!empty($this->post['name']) ? $this->post['name'] : '(null)'),
            'rename' => $rename,
            'is_dir' => $is_dir,
            'function' => $fn
        );
        if (!empty($this->options['MoveIsAuthenticated_cb']) && function_exists($this->options['MoveIsAuthenticated_cb']) && !$this->options['MoveIsAuthenticated_cb']($this, 'move', $fileinfo))
            throw new FileManagerException('authenticated');

        if (!$this->checkFile($file) || (!$rename && $is_dir))
            throw new FileManagerException('nofile');

        if($rename || $is_dir)
        {
            if (empty($this->post['name']))
                throw new FileManagerException('nonewfile');

            $newname = $this->getName($this->post['name'], $dir);
            $fn = 'rename';
            $tnfn = FileManagerUtility::getSiteRoot() . $this->options['thumbnailPath'] . $this->generateThumbName($file);
            if(!$is_dir && file_exists($tnfn))
            {
                if (!@unlink($tnfn))
                    throw new FileManagerException('delete_thumbnail_failed');
            }
        }
        else
        {
            $newname = $this->getName(pathinfo($file, PATHINFO_FILENAME), $this->getDir($this->post['newDirectory']));
            //$fn = !empty($this->post['copy']) ? 'copy' : 'rename';
        }

        if (!$newname)
            throw new FileManagerException('nofile');

        $extOld = pathinfo($file, PATHINFO_EXTENSION);
        $extNew = pathinfo($newname, PATHINFO_EXTENSION);
        if ($extOld != $extNew) $newname .= '.' . $extOld;
        if (!@$fn($file, $newname))
            throw new FileManagerException($fn . '_failed');

        echo json_encode(array(
            'name' => pathinfo($this->normalize($newname), PATHINFO_BASENAME),
        ));
    }
    catch(FileManagerException $e)
    {
        $emsg = explode(':', $e->getMessage(), 2);
        echo json_encode(array(
                'status' => 0,
                'error' => '${upload.' . $emsg[0] . '}' . (isset($emsg[1]) ? $emsg[1] : '')
            ));
    }
    catch(Exception $e)
    {
        // catching other severe failures; since this can be anything and should only happen in the direst of circumstances, we don't bother translating
        echo json_encode(array(
                'status' => 0,
                'error' => $e->getMessage()
            ));
    }
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

  /**
   * Make a unique filename
   *
   * Return the file (dir + name + ext), or a unique, yet non-existing, variant thereof, where the filename
   * is appended with a '_' and a number, e.g. '_1', when the file itself already exists in the given
   * directory. The directory part of the returned value equals $dir.
   *
   * Return NULL when $file is empty or when the specified directory does not reside within the
   * directory tree rooted by options['directory']
   *
   * Note that the given filename $file will be converted to a legal filename, containing a filesystem-legal
   * subset of ASCII characters only, before being used and returned by this function.
   */
  protected function getName($file, $dir)
  {
    if (!FileManagerUtility::endsWith($dir, '/')) $dir .= '/';

    if (!$file || !FileManagerUtility::startsWith($dir, $this->basedir)) return null;

    $pathinfo = pathinfo($file);

    /*
    since 'pagetitle()' is used to produce a unique, non-existing filename, we can forego the dirscan
    and simply check whether the constructed filename/path exists or not and bump the suffix number
    by 1 until it does not, thus quickly producing a unique filename.

    This is faster than using a dirscan to collect a set of existing filenames and feeding them as
    an option array to pagetitle(), particularly for large directories.
    */
    $filename = FileManagerUtility::pagetitle($pathinfo['filename']);
    // make sure the generated filename is SAFE:
    $file = $dir . $filename . (!empty($pathinfo['extension']) ? '.' . $pathinfo['extension'] : null);
    for ($i = 0; ; $i++)
    {
        $file = $dir . $filename . ($i ? '_' . $i : '') . (!empty($pathinfo['extension']) ? '.' . $pathinfo['extension'] : null);
        if (!file_exists($file))
            break;
    }

    return $file;
  }

  protected function getIcon($file,$smallIcon = false)
  {
    if (FileManagerUtility::endsWith($file, '/..')) $ext = 'dir_up';
    elseif (is_dir($file)) $ext = 'dir';
    else $ext = pathinfo($file, PATHINFO_EXTENSION);

    $largeDir = ($smallIcon === false && $this->listType == 'thumb') ? 'Large/' : '';
    $path = (is_file(FileManagerUtility::getSiteRoot() . $this->options['assetBasePath'] . 'Images/Icons/' .$largeDir.$ext.'.png'))
      ? $this->options['assetBasePath'] . 'Images/Icons/'.$largeDir.$ext.'.png'
      : $this->options['assetBasePath'] . 'Images/Icons/'.$largeDir.'default.png';

    return $path;
  }

  protected function getThumb($file)
  {
    $thumb = $this->generateThumbName($file);
    $thumbPath = FileManagerUtility::getSiteRoot() . $this->options['thumbnailPath'] . $thumb;
    if (is_file($thumbPath))
      return $thumb;
    elseif(is_file(FileManagerUtility::getSiteRoot() . $this->options['thumbnailPath'].basename($file)))
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
    $img->resize(250,250,true,false)->process('png',$thumbPath); // TODO: save as lossy / lower-Q jpeg to reduce filesize?
    unset($img);
    return basename($thumbPath);
  }

  protected function deleteThumb($file)
  {
    $thumb = $this->generateThumbName($file);
    $thumbPath = FileManagerUtility::getSiteRoot() . $this->options['thumbnailPath'] . $thumb;
    if(is_file($thumbPath))
      @unlink($thumbPath);
  }

  public function getMimeType($file){
    return is_dir($file) ? 'text/directory' : Upload::mime($file, null, $this->getMimeTypeDefinitions());
  }

  /**
   * Produce the absolute path equivalent, filesystem-wise, of the given $dir directory.
   *
   * The directory is enforced to sit within the directory tree rooted by options['directory']
   *
   * When the directory does not exist or does not match other restricting criteria, the 
   * basedir path (abs path eqv. to options['directory']) is returned instead.
   */
  protected function getDir($dir = null){
    $dir = FileManagerUtility::getSiteRoot() . FileManagerUtility::getRealPath($this->options['directory'] . $dir);
    return $this->checkFile($dir) ? $dir : $this->basedir;
  }
  
  protected function getPath($file) {
    $file = $this->normalize(substr($file, $this->length));
    return $file;
  }
  
  protected function checkFile($file) {
    $mimes = $this->getAllowedMimeTypes();

    $hasFilter = $this->filter && count($mimes);
    if ($hasFilter) array_push($mimes, 'text/directory');
    //return !(!$file || !FileManagerUtility::startsWith($file, $this->basedir) || !file_exists($file) || ($hasFilter && !in_array($this->getMimeType($file), $mimes)));
    // applied boolean logic for easier grokking of same:
    return !empty($file) && FileManagerUtility::startsWith($file, $this->basedir) && file_exists($file) && (!$hasFilter || in_array($this->getMimeType($file), $mimes));
  }
  
  protected function normalize($file) {
    return preg_replace('/\\\|\/{2,}/', '/', $file);
  }

  public function getAllowedMimeTypes($filter = null){
    $filter = (!$filter ? $this->filter : $filter);
    $mimeTypes = array();

    if (!$filter) return null;
    if (!FileManagerUtility::endsWith($filter, '/')) return array($filter);

    $mimes = $this->getMimeTypeDefinitions();

    foreach ($mimes as $mime)
      if (FileManagerUtility::startsWith($mime, $filter))
        $mimeTypes[] = strtolower($mime);

    return $mimeTypes;
  }

  public function getMimeTypeDefinitions(){
    static $mimes;

    if (!$mimes) $mimes = parse_ini_file($this->options['mimeTypesPath']);
    if (!$mimes) $mimes = array(); // prevent faulty mimetype ini file from b0rking other code sections.
    return $mimes;
  }
}

class FileManagerException extends Exception {}

/* Stripped-down version of some Styx PHP Framework-Functionality bundled with this FileBrowser. Styx is located at: http://styx.og5.net */
class FileManagerUtility
{
  public static function endsWith($string, $look){
    return strrpos($string, $look)===strlen($string)-strlen($look);
  }

  public static function startsWith($string, $look){
    return strpos($string, $look)===0;
  }

  /**
   * Check a given name $data against an optional set of names ($options array)
   * and return the name itself when it does not exist in the set,
   * otherwise return an augmented name such that it does not exist in the set
   * while having been constructed as name plus '_' plus an integer number,
   * starting at 1.
   *
   * Example:
   * If the set is {'file', 'file_1', 'file_3'} then $data = 'file' will return
   * the string 'file_2' instead, while $data = 'fileX' will return that same
   * value: 'fileX'.
   */
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

    $lwr_data = strtolower($data);

    foreach ($options as $content)
      if ($content && strtolower($content) == $lwr_data . ($i ? '_' . $i : ''))
        return self::checkTitle($data, $options, ++$i);

    return $data.($i ? '_' . $i : '');
  }

  public static function isBinary($str){
    $array = array(0, 255);
    for($i = 0; $i < strlen($str); $i++)
      if (in_array(ord($str[$i]), $array)) return true;

    return false;
  }

// unused method:
//
//  public static function getPath(){
//    static $path;
//    return $path ? $path : $path = pathinfo(str_replace('\\','/',__FILE__), PATHINFO_DIRNAME);
//  }

  /**
   * Return the filesystem absolute path to the directory pointed at by this site's DocumentRoot.
   *
   * Note that the path is returned WITHOUT a trailing slash '/'.
   */
  public static function getSiteRoot()
  {
    $path = str_replace('\\','/',$_SERVER['DOCUMENT_ROOT']);
    $path = (FileManagerUtility::endsWith($path,'/')) ? substr($path, 0, -1) : $path;

    return $path;
  }
  
  public static function getRealPath($path) {
    
    $path = str_replace('\\','/',$path);
    $path = preg_replace('#/+#','/',$path);
    $path = str_replace($_SERVER['DOCUMENT_ROOT'],'',$path);
    
    $path = (FileManagerUtility::startsWith($path,'/')) ? $_SERVER['DOCUMENT_ROOT'].$path : $path;
    $path = (FileManagerUtility::startsWith($path,'../') || !FileManagerUtility::startsWith($path,'/')) ? realPath($path) : $path;
    $path = str_replace('\\','/',$path);    
    $path = str_replace($_SERVER['DOCUMENT_ROOT'],'',$path);
    $path = (FileManagerUtility::endsWith($path,'/')) ? $path : $path.'/';
    
    return $path;
  }

  /**
   * Apply rawurlencode() to each of the elements of the given path
   *
   * @note
   *   this method is provided as rawurlencode() tself also encodes the '/' separators in a path/string
   *   and we do NOT want to 'revert' such change with the risk of also picking up other %2F bits in
   *   the string (this assumes crafted paths can be fed to us).
   */
  public static function rawurlencode_path($path)
  {
    $encoded_path = explode('/', $path);
    array_walk($encoded_path, function(&$value, $key)
        {
            $value = rawurlencode($value);
        });
    return implode('/', $encoded_path);
  }
}