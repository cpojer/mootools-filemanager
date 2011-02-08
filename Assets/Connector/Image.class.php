<?php
/**
 * Image - Provides an Interface to the GD-Library for image manipulation
 *
 *
 * @license MIT-style License
 * @author Christoph Pojer <christoph.pojer@gmail.com>
 * @author Additions: Fabian Vogelsteller <fabian.vogelsteller@gmail.com> 
 *
 * @link http://www.bin-co.com/php/scripts/classes/gd_image/ Based on work by "Binny V A"
 * 
 * @version 1.1
 * Changlog<br>
 *    - 1.1 add real resizing, with comparison of ratio
 *    - 1.01 small fixes in process method and add set memory limit to a higher value
 */

class Image {
	/**
	 * The path to the image file
	 *
	 * @var string
	 */
	private $file;
	/**
	 * The image resource
	 *
	 * @var resource
	 */
	private $image;
	/**
	 * Metadata regarding the image
	 *
	 * @var array
	 */
	private $meta;
	
	/**
	 * @param string $file The path to the image file
	 */
	public function __construct($file){
	  ini_set('memory_limit', '64M'); //  handle large images
	  
	  $file = str_replace('\\','/',$file);
    $file = preg_replace('#/+#','/',$file);
    $file = str_replace($_SERVER['DOCUMENT_ROOT'],'',$file);
	  $file = $_SERVER['DOCUMENT_ROOT'].$file;
		$file = realpath($file);
    if(!file_exists($file))
			return;
		
		$this->file = $file;
		$img = getimagesize($file);
		
		/*
		echo basename($file)."\n";
		var_dump(filesize($file));
		$this->showMemoryUsage();
    echo "\n";
    */

		$this->meta = array(
			'width' => $img[0],
			'height' => $img[1],
			'mime' => $img['mime'],
			'ext' => end(explode('/', $img['mime'])),
		);
		
		if($this->meta['ext']=='jpg')
			$this->meta['ext'] = 'jpeg';
		if(!in_array($this->meta['ext'], array('gif', 'png', 'jpeg')))
			return;
		
		if(in_array($this->meta['ext'], array('gif', 'png'))){
			$this->image = $this->create();
			
			$fn = 'imagecreatefrom'.$this->meta['ext'];
			$original = $fn($file);
			imagecopyresampled($this->image, $original, 0, 0, 0, 0, $this->meta['width'], $this->meta['height'], $this->meta['width'], $this->meta['height']);
		} else {
			$this->image = imagecreatefromjpeg($file);
		}
	}
	
	public function __destruct(){	  
		if(!empty($this->image)) imagedestroy($this->image);
		unset($this->image);
	}
	
	/**
	 * Returns the size of the image
	 *
	 * @return array
	 */
	public function getSize(){
		return array(
			'width' => $this->meta['width'],
			'height' => $this->meta['height'],
		);
	}
	
	/**
	 * Creates a new, empty image with the desired size
	 *
	 * @param int $x
	 * @param int $y
	 * @param string $ext
	 * @return resource
	 */
	private function create($x = null, $y = null, $ext = null){
		if(!$x) $x = $this->meta['width'];
		if(!$y) $y = $this->meta['height'];
		
		$image = imagecreatetruecolor($x, $y);
		if(!$ext) $ext = $this->meta['ext'];
		if($ext=='png'){
			imagealphablending($image, false);
			imagefilledrectangle($image, 0, 0, $x, $y, imagecolorallocatealpha($image, 0, 0, 0, 127));
		}
		
		return $image;
	}
	
	/**
	 * Replaces the image resource with the given parameter
	 *
	 * @param resource $new
	 */
	private function set($new){
	  if(!empty($this->image)) imagedestroy($this->image);
		$this->image = $new;
		
		$this->meta['width'] = imagesx($this->image);
		$this->meta['height'] = imagesy($this->image);
	}
	
	/**
	 * Returns the path to the image file
	 *
	 * @return string
	 */
	public function getImagePath(){
		return $this->file;
	}

	/**
	 * Returns the resource of the image file
	 *
	 * @return resource
	 */
	public function getResource(){
		return $this->image;
	}
	
	/**
	 * Rotates the image by the given angle
	 *
	 * @param int $angle
	 * @param array $bgcolor An indexed array with red/green/blue/alpha values
	 * @return Image
	 */
	public function rotate($angle, $bgcolor = null){
		if(empty($this->image) || !$angle || $angle>=360) return $this;
		
		$this->set(imagerotate($this->image, $angle, is_array($bgcolor) ? imagecolorallocatealpha($this->image, $bgcolor[0], $bgcolor[1], $bgcolor[2], !empty($bgcolor[3]) ? $bgcolor[3] : null) : $bgcolor));

		return $this;
	}
	
	/**
	 * Resizes the image to the given size, automatically calculates
	 * the new ratio if parameter {@link $ratio} is set to true
	 *
	 * @param int $x
	 * @param int $y
	 * @param bool $ratio
	 * @param bool $resizeWhenSmaller if FALSE the images will not be resized when already smaller, if TRUE the images will always be resized
	 * @return false|resource Image resource or fals, if it couldnt be resized
	 */
	public function resize($x = null, $y = null, $ratio = true, $resizeWhenSmaller = true){
		if(empty($this->image) || (empty($x) && empty($y))) return false;
		
		$xStart = $x;
    $yStart = $y;
    $ratioX = $this->meta['width'] / $this->meta['height'];
    $ratioY = $this->meta['height'] / $this->meta['width'];
    //echo 'ALLOWED: <br>'.$xStart.'x'."<br>".$yStart.'y'."<br>---------------<br>"; 
    // ->> keep the RATIO
    if($ratio) {
      //echo 'BEGINN: <br>'.$this->meta['width'].'x'."<br>".$this->meta['height'].'y'."<br><br>"; 
        // -> align to WIDTH
        if(!empty($x) && ($x < $this->meta['width'] || $resizeWhenSmaller))
          $y = round($x / $ratioX);
        // -> align to HEIGHT
        elseif(!empty($y) && ($y < $this->meta['height'] || $resizeWhenSmaller))
          $x = round($y / $ratioY);
        else {
          $y = $this->meta['height'];
          $x = $this->meta['width'];
        }        
      //echo 'BET: <br>'.$x.'x'."<br>".$y.'y'."<br><br>";
      // ->> align to WIDTH AND HEIGHT     
      if((!empty($yStart) && $y > $yStart) || (!empty($xStart) && $x > $xStart)) {
        if($y > $yStart) {
          $y = $yStart;
          $x = round($y / $ratioY);
        } elseif($x > $xStart) {
          $x = $xStart;
          $y = round($x / $ratioX);
        }
      }
    // ->> DONT keep the RATIO (but keep ration when, only width OR height is set)
    } else {
      // RATIO X
      if(!empty($y) && empty($x) && ($y < $this->meta['height'] || $resizeWhenSmaller))
        $x = round($y / $ratioX);
      // RATIO Y
      elseif(empty($y) && !empty($x) && ($x < $this->meta['width'] || $resizeWhenSmaller))
        $y = round($x / $ratioY);
      else {
        $y = $this->meta['height'];
        $x = $this->meta['width'];
      }
    }
		//echo 'END: <br>'.$x.'x'."<br>".$y.'y'."<br><br>";
		
		$new = $this->create($x, $y);
		if(imagecopyresampled($new, $this->image, 0, 0, 0, 0, $x, $y, $this->meta['width'], $this->meta['height'])) {
  		$this->set($new);
  		return $this;
  	} else
  	 return false;
	}
	
	/**
	 * Crops the image. The values are given like margin/padding values in css
	 *
	 * <b>Example</b>
	 * <ul>
	 * <li>crop(10) - Crops by 10px on all sides</li>
	 * <li>crop(10, 5) - Crops by 10px on top and bottom and by 5px on left and right sides</li>
	 * <li>crop(10, 5, 5) - Crops by 10px on top and by 5px on left, right and bottom sides</li>
	 * <li>crop(10, 5, 3, 2) - Crops by 10px on top, 5px by right, 3px by bottom and 2px by left sides</li>
	 * </ul>
	 *
	 * @param int $top
	 * @param int $right
	 * @param int $bottom
	 * @param int $left
	 * @return Image
	 */
	public function crop($top, $right = null, $bottom = null, $left = null){
		if(empty($this->image)) return $this;
		
		if(!is_numeric($right) && !is_numeric($bottom) && !is_numeric($left))
			$right = $bottom = $left = $top;
		
		if(!is_numeric($bottom) && !is_numeric($left)){
			$bottom = $top;
			$left = $right;
		}
		
		if(!is_numeric($left))
			$left = $right;
		
		$x = $this->meta['width']-$left-$right;
		$y = $this->meta['height']-$top-$bottom;

		if($x<0 || $y<0) return $this;
		
		$new = $this->create($x, $y);
		imagecopy($new, $this->image, 0, 0, $left, $top, $x, $y);
		$this->set($new);
		
		return $this;
	}
	
	/**
	 * Flips the image horizontally or vertically. To Flip both just use ->rotate(180)
	 *
	 * @see Image::rotate()
	 * @param string $type Either horizontal or vertical
	 * @return Image
	 */
	public function flip($type){
		if(empty($this->image) || !in_array($type, array('horizontal', 'vertical'))) return $this;
		
		$new = $this->create();
		
		if($type=='horizontal')
			for($x=0;$x<$this->meta['width'];$x++)
				imagecopy($new, $this->image, $this->meta['width']-$x-1, 0, $x, 0, 1, $this->meta['height']);
		elseif($type=='vertical')
			for($y=0;$y<$this->meta['height'];$y++)
				imagecopy($new, $this->image, 0, $this->meta['height']-$y-1, 0, $y, $this->meta['width'], 1);
		
		$this->set($new);
		
		return $this;
	}
	
	/**
	 * Stores the image in the desired directory or overwrite the old one
	 *
	 * @param string $ext
	 * @param string $file
	 */
	public function process($ext = null, $file = null){
	  if(!empty($this->image)) {
  		if(!$ext) $ext = $this->meta['ext'];
  		if($ext=='jpg')	$ext = 'jpeg';
      if($ext=='png') imagesavealpha($this->image, true);
  		
  		if($file == null)
  		  $file = $this->file;
  		
      $fn = 'image'.$ext;
  		if($ext == 'jpeg')
  		  $fn($this->image, $file,100);
  		else
  		  $fn($this->image, $file);
  		  
  		
  		// If there is a new filename change the internal name too
  		if($file) $this->file = $file;
  		return true;
		} else
		  return false;
	}

	/**
	 * Saves the image to the given path
	 *
	 * @param string $file Leave empty to replace the original file
	 * @return Image
	 */
	public function save($file = null){
		if(empty($this->image)) return $this;
		
		if(!$file) $file = $this->file;
		
		$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
		if(!$ext){
			$file .= '.'.$this->meta['ext'];
			$ext = $this->meta['ext'];
		}
		
		if($ext=='jpg') $ext = 'jpeg';
		
		if(!in_array($ext, array('png', 'jpeg', 'gif')))
			return $this;
		
		$this->process($ext, $file);
		
		return $this;
	}

	/**
	 * Outputs the manipulated image
	 *
	 * @return Image
	 */
	public function show(){
		if(empty($this->image)) return $this;
		
		header('Content-type: '.$this->meta['mime']);
		$this->process();
		
		return $this;
	}
	
}