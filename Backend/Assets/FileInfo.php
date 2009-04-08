<?php
class FileInfo {
	
	public static function get($file, $url, $mime){
		$mime = strtolower($mime);
		
		if(startsWith($mime, 'image/')){
			$size = getimagesize($file);
			
			$content = '<img class="prev"'.($size[0]<100 || $size[1]<100 ? ' style="width: '.$size[0].'px; height: '.$size[1].'px; padding: '.round((100-$size[0])/2).'px '.round((100-$size[1])/2).'px; min-width: 0; min-height: 0;"' : '').' src="'.Core::retrieve('app.link').'thumb.php/'.BrowserLayer::normalize($url).'" alt="" />
				<h2>'.Lang::retrieve('browser.more').'</h2>
				<dl>
					<dt>'.Lang::retrieve('browser.width').'</dt>
					<dd>'.$size[0].'px</dd>
					<dt>'.Lang::retrieve('browser.height').'</dt>
					<dd>'.$size[1].'px</dd>
				</dl>';
		}elseif($mime=='text/plain'){
			$content = file_get_contents($file, null, null, 0, 300);
			$content = '<textarea cols="20" rows="6" readonly="readonly">
					'.(self::isBinary($content) ? '' : htmlentities($content)).'
				</textarea>';
		}elseif($mime=='application/zip'){
			$getid3 = new getID3();
			$getid3->Analyze($file);
			
			natcasesort($getid3->info['zip']['files']);
			foreach($getid3->info['zip']['files'] as $f => $size){        
				if(is_array($size)) $icon = 'dir';
				else $icon = BrowserLayer::getIcon($f);
				
				$out[$icon=='dir' ? 0 : 1][] = '<li><a><img src="BrowserIcons/'.$icon.'.png" alt="" /> '.$f.'</a></li>';
			}
			
			$out = array_merge(pick($out[0], array()), pick($out[1], array()));
			$content = '<dl>
					<dt>'.Lang::retrieve('browser.content').'</dt>
					<dd>
						<ul>'.implode($out).'</ul>
					</dd>
				</dl>';
		}elseif($mime=='audio/mpeg'){
			$getid3 = new getID3();
			$getid3->Analyze($file);
			
			$content = '<div class="object">
					<object type="application/x-shockwave-flash" data="Assets/dewplayer.swf?mp3='.rawurlencode($url).'&volume=30" width="200" height="20">
						<param name="movie" value="Assets/dewplayer.swf?mp3='.rawurlencode($url).'&volume=30" />
					</object>
				</div>
				<h2>'.Lang::retrieve('browser.more').'</h2>
				<dl>
					<dt>'.Lang::retrieve('browser.title').'</dt>
					<dd>'.$getid3->info['comments']['title'][0].'</dd>
					<dt>'.Lang::retrieve('browser.artist').'</dt>
					<dd>'.$getid3->info['comments']['artist'][0].'</dd>
					<dt>'.Lang::retrieve('browser.album').'</dt>
					<dd>'.$getid3->info['comments']['album'][0].'</dd>
					<dt>'.Lang::retrieve('browser.length').'</dt>
					<dd>'.$getid3->info['playtime_string'].'</dd>
					<dt>'.Lang::retrieve('browser.bitrate').'</dt>
					<dd>'.round($getid3->info['bitrate']/1000).'kbps</dd>
				</dl>';
		}else{
			$content = '<dl>
					<dt></dt>
					<dd class="margin">
						'.Lang::retrieve('browser.nopreview').'
						<button value="'.$url.'">'.Lang::retrieve('browser.download').'</button>
					</dd>
				</dl>';
		}
		
		return $content;
	}
	
	function isBinary($str){
		for($i = 0;$i<strlen($str);$i++){
			$chr = ord($str{$i});
			if($chr==0 or $chr==255){
				$binary = true;
				break;
			}
		}
		return !!$binary;
	}
	
}