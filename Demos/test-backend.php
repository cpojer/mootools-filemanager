<?php

error_reporting(E_ALL | E_STRICT);

define("COMPACTCMS_CODE", true);

//require_once('../Assets/Connector/FileManager.php');
require_once('../Assets/Connector/FMgr4Alias.php');



define('DEVELOPMENT', 01);   // set to 01 / 1 to enable logging of each incoming event request.




// dumper useful in development
function FM_vardumper($mgr = null, $action = null, $info = null, $filenamebase = null)
{
	if (DEVELOPMENT)
	{
		if (!is_string($filenamebase))
		{
			$filenamebase = basename(__FILE__);
		}

		if ($mgr)
			$settings = $mgr->getSettings();
		else
			$settings = null;

		//$mimetdefs = $mgr->getMimeTypeDefinitions();

		// log request data:
		ob_start();
			echo "FileManager::action:\n";
			var_dump($action);
			echo "\n\nFileManager::info:\n";
			var_dump($info);
			echo "\n\nFileManager::settings:\n";
			var_dump($settings);

			if (01) // set to 'if (01)' if you want this bit dumped as well; fastest back-n-forth edit that way :-)
			{
				echo "\n\n_SERVER:\n";
				var_dump($_SERVER);
			}
			if (0)
			{
				echo "\n\n_ENV:\n";
				if (isset($_ENV)) var_dump($_ENV); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_GET:\n";
				if (isset($_GET)) var_dump($_GET); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_POST:\n";
				if (isset($_POST)) var_dump($_POST); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_REQUEST:\n";
				if (isset($_REQUEST)) var_dump($_REQUEST); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_FILES:\n";
				if (isset($_FILES)) var_dump($_FILES); else echo "(null)\n";
			}
			if (01)
			{
				echo "\n\n_COOKIE:\n";
				if (isset($_COOKIE)) var_dump($_COOKIE); else echo "(null)\n";
			}
			if (0)
			{
				echo "\n\n_SESSION:\n";
				if (isset($_SESSION)) var_dump($_SESSION); else echo "(null)\n";
			}
		$dump = ob_get_clean();
		static $count;
		if (!$count) $count = 1; else $count++;
		$dst = ((!empty($filenamebase) ? $filenamebase . '.' : '') . date('Ymd-His') . '.' . fmod(microtime(true), 1) . '-' . $action . '-' . $count . '.log');
		$dst = preg_replace('/[^A-Za-z0-9-_.]+/', '_', $dst);    // make suitable for filesystem
		@file_put_contents($dst, html_entity_decode(strip_tags($dump), ENT_NOQUOTES, 'UTF-8'));
	}
}



?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>MooTools FileManager Backend Testground</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link rel="shortcut icon" href="http://og5.net/christoph/favicon.png" />
  <style type="text/css">
  body {
    font-size: 11px;
    font-family: Tahoma, sans-serif;
  }
  
  h1 {
    margin: 0 0 10px 0;
    padding: 0;
    
    color: #666;
    font-weight: normal;
    font-size: 24px;
    letter-spacing: 1px;
    word-spacing: 2px;
    line-height: 22px;
    min-height: 25px;
  }

  h1 span {
    font-size: 11px;
    letter-spacing: 0;
    word-spacing: 0;
    text-shadow: none;
  }
  
  .blue { color: #1f52b0; }
  
  div.content {
    min-height: 200px;
    margin: 23px 34px;
    padding: 10px 17px;
    border: 1px solid #b2b2b2;
    background: #fff;
    box-shadow: rgba(0, 0, 0, 0.3) 0 0 10px;
  -moz-box-shadow: rgba(0, 0, 0, 0.3) 0 0 10px;
  -webkit-box-shadow: rgba(0, 0, 0, 0.3) 0 0 10px;
  }
  
  div.content div.example {
    float: left;
    clear: both;
    margin: 10px 0;
  }
  
  button {
    margin: 5px 0;
  }

  /* http://labnol.blogspot.com/2006/10/html-css-trick-for-displaying-code.html */  
  pre {
	white-space: pre-wrap; /* css-3 */
	white-space: -moz-pre-wrap !important; /* Mozilla, since 1999 */
	white-space: -pre-wrap; /* Opera 4-6 */
	white-space: -o-pre-wrap; /* Opera 7 */
	word-wrap: break-word; /* Internet Explorer 5.5+ */
  }
  </style>
  
	<script type="text/javascript" src="../../../../../lib/includes/js/mootools-core.js"></script>
	<script type="text/javascript" src="../../../../../lib/includes/js/mootools-more.js"></script>
  
  <script type="text/javascript" src="../Source/FileManager.js"></script>
  <script type="text/javascript" src="../Source/Gallery.js"></script>
  <script type="text/javascript" src="../Source/Uploader/Fx.ProgressBar.js"></script>
  <script type="text/javascript" src="../Source/Uploader/Swiff.Uploader.js"></script>
  <script type="text/javascript" src="../Source/Uploader.js"></script>
  <script type="text/javascript" src="../Language/Language.en.js"></script>
  <script type="text/javascript" src="../Language/Language.de.js"></script>
  
  <script type="text/javascript">
    window.addEvent('domready', function() {

    });
  </script>
</head>
<body>
<div id="content" class="content">
  <h1>FileManager Backend Tests</h1>

  <h2>Basic PHP tests</h2>
  <pre>
<?php



// log request data:
FM_vardumper(null, 'testFM' . (!empty($_GET['event']) ? '-' . $_GET['event'] : null));



if (01) // debugging
{
	$re_extra = '-_., []()~!@+' /* . '#&' */;
	$trim_extra = '-_,~@+#&';
	
	echo "pagetitle(str, NULL, '$re_extra', '$trim_extra'): regex to filter file &amp; dirnames before they are created:\n";
	
	// ASCII range
	for ($i = 0; $i < 8; $i++)
	{
		$msg = '';
		$str = '';
		for ($j = 0; $j < 16; $j++)
		{
			$c = $i * 16 + $j;
			switch ($c)
			{
			case 9:
				$msg .= "(TAB)";
				break;
				
			case 13:
				$msg .= "(CR)";
				break;
				
			case 10:
				$msg .= "(LF)";
				break;
				
			default:
				$msg .= ($c >= 32 ? htmlentities(chr($c), ENT_NOQUOTES, 'UTF-8') : '&#' . $c . ';');
				break;
			}
			$str .= chr($c);
		}
	
		echo "ORIG:     [X" . $msg . "X]";
		if ($i < 2)
		{
			echo " (these characters are 'low ASCII' charactercodes " . ($i * 16) . " ... " . ($i * 16 + 15);
		}
		echo "\n";
		
		$r = FileManagerUtility::pagetitle('X' . $str . 'X', null, $re_extra, $trim_extra);

		echo "FILTERED: [" . htmlentities($r, ENT_NOQUOTES, 'UTF-8') . "]\n\n";
	}
	
	$trimset = '_.';
	echo "\n\ntrim() with multiple characters in the trim set: [$trimset]\n";
	
	$test = array(
		'.ignore',
		'___ignore',
		'_._.ignore',
		'._._ignore',
		'X.ignore',
		'X___ignore',
		'X_._.ignore',
		'X._._ignore',
		'__X_ignore',
		'_._X.ignore',
		'._.X_ignore'
		);
	foreach ($test as $t)
	{
		$r = trim($t, $trimset);

		echo "\nORIG: [" . htmlentities($t, ENT_NOQUOTES, 'UTF-8') . "]\nRES:  [" . htmlentities($r, ENT_NOQUOTES, 'UTF-8') . "]\n";
	}
}


$browser = new FileManagerWithAliasSupport(array(
	'directory' => 'Files/',                   // relative paths: are relative to the URI request script path, i.e. dirname(__FILE__)
	//'thumbnailPath' => 'Files/Thumbnails/',
	'assetBasePath' => '../Assets',
	'chmod' => 0777,
	//'maxUploadSize' => 1024 * 1024 * 5,
	//'upload' => false,
	//'destroy' => false,
	//'create' => false,
	//'move' => false,
	//'download' => false,
	//'filter' => 'image/',
	'allowExtChange' => true,                  // allow file name extensions to be changed; the default however is: NO (FALSE)
	'UploadIsAuthorized_cb' => 'FM_IsAuthorized',
	'DownloadIsAuthorized_cb' => 'FM_IsAuthorized',
	'CreateIsAuthorized_cb' => 'FM_IsAuthorized',
	'DestroyIsAuthorized_cb' => 'FM_IsAuthorized',
	'MoveIsAuthorized_cb' => 'FM_IsAuthorized'
	
	// http://httpd.apache.org/docs/2.2/mod/mod_alias.html -- we only emulate the Alias statement.
	// Implementing other path translation features is left as an exercise to the reader:
	, 'Aliases' => array(
		'/c/lib/includes/js/mootools-filemanager/Demos/Files/alias' => "D:/xxx",
		'/c/lib/includes/js/mootools-filemanager/Demos/Files/d' => "D:/xxx.tobesorted",
		'/c/lib/includes/js/mootools-filemanager/Demos/Files/u' => "D:/websites-uploadarea",
		
		'/c/lib/includes/js/mootools-filemanager/Demos/Files' => "D:/experiment"
	)
));

echo "\n\n";
$settings = $browser->getSettings();
var_dump($settings);

?>
</pre>
<h2>Important server variables</h2>

<p>$_SERVER['DOCUMENT_ROOT'] = '<?php echo $_SERVER['DOCUMENT_ROOT']; ?>'</p>
<p>$_SERVER['SCRIPT_NAME'] = '<?php echo $_SERVER['SCRIPT_NAME']; ?>'</p>

<h2>FileManagerUtility class static methods</h2>

<?php

$re_extra = '-_., []()~!@+' /* . '#&' */;
$trim_extra = '-_,~@+#&';

?>
<h3>pagetitle(str, NULL, '<?php echo $re_extra; ?>', '<?php echo $trim_extra; ?>')</h3>

<?php

$test = array(
	array('src' => '.htaccess', 'expect' => 'htaccess'),
	array('src' => 'regular.jpg', 'expect' => 'regular.jpg'),
	array('src' => 'Umgebung Altstadt Østgat', 'expect' => 'Umgebung Altstadt Ostgat'),
	array('src' => '  Sed ut perspiciatis unde omnis iste natus error ', 'expect' => 'Sed ut perspiciatis unde omnis iste natus error'),
	array('src' => '  advantage from it? But who has any right  ', 'expect' => 'advantage from it_ But who has any right'),
	array('src' => 'welche aus geistiger Schwäche, d.h.', 'expect' => 'welche aus geistiger Schwaeche, d.h'),
	array('src' => 'München - Ausrüstung - Spaß - Viele Grüße!', 'expect' => 'Muenchen - Ausruestung - Spass - Viele Gruesse!'),
	array('src' => 'C:\\Windows\\TEMP\\', 'expect' => 'C_Windows_TEMP'),
	array('src' => '/etc/passwd', 'expect' => 'etc_passwd'),
	array('src' => 'Let\'s see what " quotes do?', 'expect' => 'Let_s see what _ quotes do'),
	array('src' => '中国出售的软件必须使用编码 新 和 湖南北部 父母通常都会对子女说地方方言 现在香港的日常使用中出现了越来越多的简体汉字 华语, 走 贵州 看不懂 清浊声', 'expect' => ''),
	array('src' => 'également appelé lorem ipsum', 'expect' => 'egalement appele lorem ipsum'),
	array('src' => 'łaciński tekst pochodzący ze starożytności, zaczerpnięty', 'expect' => 'aci_ski tekst pochodz_cy ze staro_ytno_ci, zaczerpni_ty'),
	array('src' => 'Ipsum текст Lorem, которые, как правило, бессмысленный список полу-латинские слова', 'expect' => 'Ipsum _ Lorem'),
	array('src' => 'اول دو واژه از رشته ای از متن لاتین مورد استفاده در طراحی وب سایت و چاپ به جای انگلیسی به استرس و با تکیه تلفظ کردن اهمیت', 'expect' => ''),
	array('src' => '설명하는 그래픽 등의 요소의 시각적 프레 젠 테이션, 문서 또는 글꼴 , 활판 인쇄술 , 그리고 레이아웃 . 의 세미 라틴어', 'expect' => ''),
	array('src' => 'פילער טעקסט) צו באַווייַזן די גראַפיק עלעמענטן פון אַ דאָקומענט אָדער וויסואַל פּרעזענטירונג, אַזאַ ווי שריפֿט , טאַפּאַגראַפי', 'expect' => ')'),
	array('src' => 'χρησιμοποιούνται κείμενο κράτησης θέσης (κείμενο πλήρωσης), για να αποδειχθεί η γραφικά στοιχεία', 'expect' => '(_ _)'),
	array('src' => 'ルダテキスト （フィラーテキスト）示すために、グラフィックなどの要素を指定するの視覚的なプレゼンテーション、', 'expect' => ''),
	array('src' => 'SQL: \'\'; DROP TABLE; \'', 'expect' => 'SQL_ _ DROP TABLE'),
	array('src' => '<script>alert(\'boom!\');</script>', 'expect' => 'script_alert(_boom!_)_script'),
	array('src' => '%20%2F%41%39 &amp; X?', 'expect' => '20_2F_41_39 _amp_ X'),
	array('src' => 'https://127893215784/xyz', 'expect' => 'https_127893215784_xyz'),
	);

foreach ($test as $tc)
{
	$t = $tc['src'];
	$e = $tc['expect'];
	$r = FileManagerUtility::pagetitle($t, null, $re_extra, $trim_extra);

	echo "\n<pre>ORIG: [" . htmlentities($t, ENT_NOQUOTES, 'UTF-8') . "]\nRES:  [" . htmlentities($r, ENT_NOQUOTES, 'UTF-8') . "]</pre>\n";
	
	if (strcmp($e, $r) != 0)
	{
		echo "<p><strong>FAILED!</strong></p>\n";
	}
	echo "\n<hr />\n";
}

?>


<h3>getSiteRoot</h3>

<p>$_SERVER['DOCUMENT_ROOT'] = '<?php echo $_SERVER['DOCUMENT_ROOT']; ?>'</p>

<p>realpath('/') = '<?php echo realpath('/'); ?>'</p>

<h3>getRequestPath</h3>

<p>getRequestPath() => '<?php echo $browser->getRequestPath(); ?>'</p>


<h3>URI to abs &amp; file path transform for DocumentRoot based URIs</h3>

<?php

$test = array(
	array('src' => ''),
	array('src' => '/'),
	array('src' => 'Files/'),
	array('src' => '/Files'),
	array('src' => '/Files/'),
	array('src' => 'Files/../alias'),
	array('src' => 'Files/../d'),
	array('src' => 'Files/../u'),
	array('src' => '/alias'),
	array('src' => '/d'),
	array('src' => '/u'),
	array('src' => 'Files/alias'),
	array('src' => 'Files/d'),
	array('src' => 'Files/u'),
	array('src' => '../Demos/Files/u'),
	array('src' => '../Assets/../Demos/Files'),
	array('src' => 'Files/././../../D/.././Demos/Files'),
	);

foreach ($test as $tc)
{
	$t = $tc['src'];
	$emsg = null;
	$r1 = '';
	$r2 = '';
	
	try
	{
		$r1 = $browser->rel2abs_url_path($t);
		$r2 = $browser->url_path2file_path($t);
    }
    catch(FileManagerException $e)
    {
        $emsg = $e->getMessage();
    }

	echo "\n<pre>ORIG:    [" . htmlentities($t, ENT_NOQUOTES, 'UTF-8') . "]\nURI.ABS: [" . htmlentities($r1, ENT_NOQUOTES, 'UTF-8') . "]\nDIR.ABS: [" . htmlentities($r2, ENT_NOQUOTES, 'UTF-8') . "]</pre>\n";
	
	if ($emsg !== null)
	{
		echo "<p><strong>FileManagerException('$emsg')!</strong></p>\n";
	}
	echo "\n<hr />\n";
}

?>

<h3>URI to abs &amp; file path transform for options['directory'] based URIs</h3>

<?php

foreach ($test as $tc)
{
	$t = $tc['src'];
	$emsg = null;
	$r1 = '';
	$r2 = '';
	$r3 = '';
	$r4 = '';
	$r5 = '';
	
	try
	{
		$r3 = $settings['directory'] . $t;
		$r5 = $browser->normalize($r3);
		$r4 = $browser->url_path2file_path($r3);
		$r1 = $browser->rel2abs_legal_url_path($t);
		$r2 = $browser->legal_url_path2file_path($t);
    }
    catch(FileManagerException $e)
    {
        $emsg = $e->getMessage();
    }

	echo "\n<pre>ORIG:    [" . htmlentities($t, ENT_NOQUOTES, 'UTF-8') . "]\nURI.ABS: [" . htmlentities($r1, ENT_NOQUOTES, 'UTF-8') . "]\nDIR.ABS: [" . htmlentities($r2, ENT_NOQUOTES, 'UTF-8') . "]\nRAW.URI: [" . htmlentities($r3, ENT_NOQUOTES, 'UTF-8') . "]\nNORMLZD: [" . htmlentities($r5, ENT_NOQUOTES, 'UTF-8') . "]\nDIR.ABS: [" . htmlentities($r4, ENT_NOQUOTES, 'UTF-8') . "]</pre>\n";
	
	if ($emsg !== null)
	{
		echo "<p><strong>FileManagerException('$emsg')!</strong></p>\n";
	}
	echo "\n<hr />\n";
}

?>

<h3>FM Aliased directory scan output</h3>

<?php

$test = array(
	array('src' => ''),
	array('src' => '/'),
	array('src' => '/Files'),
	array('src' => '/Files/..'),
	array('src' => '/Files/../alias/'),
	array('src' => '/Files/../d'),
	array('src' => '/Files/../u'),
	);


foreach ($test as $tc)
{
	$t = $tc['src'];
	$emsg = null;
	$r1 = '';
	$r2 = '';
	$c1 = '';
	
	try
	{
		$r1 = $browser->rel2abs_legal_url_path($t);
		$r2 = $browser->legal_url_path2file_path($t);
		
		$c1 = $browser->scandir($r2);
    }
    catch(FileManagerException $e)
    {
        $emsg = $e->getMessage();
    }

	echo "\n<strong><pre>dir = '$r2'</pre></strong>\n";
	
	echo "\n<h4>scandir output:</h4>\n<pre>";
	var_dump($c1);
	echo "</pre>\n";
	
	if ($emsg !== null)
	{
		echo "<p><strong>FileManagerException('$emsg')!</strong></p>\n";
	}
	echo "\n<hr />\n";
}

?>










<h3>FM 'view' output</h3>

<pre>
<?php
$dump = '{}';
ob_start();
	$_POST = array();
	$_POST['directory'] = '/'; // '/bugger/';
	$_POST['file'] = '0[]~!@()-._  90826039_1_1_3.jpg';
	$_POST['type'] = 'thumb';
	$browser->fireEvent('detail');
$dump = ob_get_clean();

echo "input:\n";
var_dump($_POST);
echo "\n\noutput for event 'detail':\n\n";

$json = json_decode($dump);
var_dump($json);

?>
<hr />


<pre>
<?php
$dump = '{}';
ob_start();
	$_POST = array();
	$_POST['directory'] = '/'; // '/bugger/';
	$_POST['file'] = 'MO mc 5.jpg';
	$_POST['type'] = 'thumb';
	$browser->fireEvent('detail');
$dump = ob_get_clean();

echo "input:\n";
var_dump($_POST);
echo "\n\noutput for event 'detail':\n\n";

//echo "</pre><div>" . htmlentities($dump, ENT_NOQUOTES, 'UTF-8') . "</div><pre>\n";
//echo "\n\n";

$json = json_decode($dump);
var_dump($json);

?>
<hr />



<pre>
<?php
$dump = '{}';
ob_start();
	$_POST = array();
	$_POST['directory'] = '';
	$_POST['filter'] = '';
	$_POST['type'] = 'list';
	$browser->fireEvent('view');
$dump = ob_get_clean();

echo "input:\n";
var_dump($_POST);
echo "\n\noutput for event 'view':\n\n";

$json = json_decode($dump);
var_dump($json);

?>
<hr />




