/**
 * FancyUpload - Flash meets Ajax for powerful and elegant uploads.
 *
 * @version		2.0.1
 *
 * @license		MIT License
 *
 * @author		Harald Kirschner <mail [at] digitarald [dot] de>
 * @copyright	Authors
 */

var FancyUpload2 = new Class({

	Extends: Swiff.Uploader,

	options: {
		limitSize: false,
		limitFiles: 5,
		instantStart: false,
		allowDuplicates: false,
		validateFile: $lambda(true), // provide a function that returns true for valid and false for invalid files.

		fileInvalid: null, // called for invalid files with error stack as 2nd argument
		fileCreate: null, // creates file element after select
		fileUpload: null, // called when file is opened for upload, allows to modify the upload options (2nd argument) for every upload
		fileComplete: null, // updates the file element to completed state and gets the response (2nd argument)
		fileRemove: null // removes the element
		/**
		 * Events:
		 * onBrowse, onSelect, onAllSelect, onCancel, onBeforeOpen, onOpen, onProgress, onComplete, onError, onAllComplete
		 */
	},

	initialize: function(status, list, options) {
		this.status = $(status);
		this.list = $(list);

		this.files = [];

		if (options.callBacks) {
			this.addEvents(options.callBacks);
			options.callBacks = null;
		}

		this.parent(options);
		this.render();
	},

	render: function() {
		this.overallTitle = this.status.getElement('.overall-title');
		this.currentTitle = this.status.getElement('.current-title');
		this.currentText = this.status.getElement('.current-text');

		var progress = this.status.getElement('.overall-progress');
		this.overallProgress = new Fx.ProgressBar(progress, {
			text: new Element('span', {'class': 'progress-text'}).inject(progress, 'after')
		});
		progress = this.status.getElement('.current-progress')
		this.currentProgress = new Fx.ProgressBar(progress, {
			text: new Element('span', {'class': 'progress-text'}).inject(progress, 'after')
		});
	},

	onLoad: function() {
		
	},

	onBeforeOpen: function(file, options) {
		var fn = this.options.fileUpload;
		var obj = (fn) ? fn.call(this, this.getFile(file), options) : options;
		return obj;
	},

	onOpen: function(file, overall) {
		file = this.getFile(file);
		file.element.addClass('file-uploading');
		this.currentProgress.cancel().set(0);
		this.currentTitle.set('html', Lang.currentprogress+' "'+file.name+'"');
	},

	onProgress: function(file, current, overall) {
		this.overallProgress.start(overall.bytesLoaded, overall.bytesTotal);
		this.currentText.set('html', Lang.speed.substitute({
			rate: (current.rate) ? this.sizeToKB(current.rate) : '- B',
			timeLeft: Date.fancyDuration(current.timeLeft || 0)
		}));
		this.currentProgress.start(current.bytesLoaded, current.bytesTotal);
	},

	onSelect: function(file, index, length) {
		var errors = [];
		if (this.options.limitSize && (file.size > this.options.limitSize)) errors.push('size');
		if (this.options.limitFiles && (this.countFiles() >= this.options.limitFiles)) errors.push('length');
		if (!this.options.allowDuplicates && this.getFile(file)) errors.push('duplicate');
		if (!this.options.validateFile.call(this, file, errors)) errors.push('custom');
		if (errors.length) {
			var fn = this.options.fileInvalid;
			if (fn) fn.call(this, file, errors);
			return false;
		}
		(this.options.fileCreate || this.fileCreate).call(this, file);
		this.files.push(file);
		return true;
	},

	onAllSelect: function(files, current, overall) {
		this.updateOverall(current.bytesTotal);
		this.status.removeClass('status-browsing');
		if (this.files.length && this.options.instantStart) this.upload.delay(10, this);
	},

	onComplete: function(file, response) {
		this.currentText.set('html', Lang.complete);
		this.currentProgress.start(100);
		(this.options.fileComplete || this.fileComplete).call(this, this.finishFile(file), response);
	},

	onError: function(file, error, info) {
		(this.options.fileError || this.fileError).call(this, this.finishFile(file), error, info);
	},

	onCancel: function() {
		this.status.removeClass('file-browsing');
	},

	onAllComplete: function(current) {
		this.updateOverall(current.bytesTotal);
		this.overallProgress.start(100);
		this.status.removeClass('file-uploading');
		
		if(this.progressTimer){
			$clear(this.progressTimer);
			$$(this.currentDots, this.currentProcess).destroy();
			this.currentDots = null;
		}
	},

	browse: function(fileList) {
		var ret = this.parent(fileList);
		if (ret !== true){
			if (ret) alert(ret);
		} else {
			this.status.addClass('file-browsing');
		}
	},

	upload: function(options) {
		if(options && options.addUrl) options.url = this.options.url+options.addUrl;
		
		var ret = this.parent(options);
		if (ret !== true) {
			if (ret) alert(ret);
		} else {
			this.status.addClass('file-uploading');
			this.overallProgress.set(0);
		}
		
		this.progressTimer = (function(){
			if(!this.currentDots){
				this.currentDots = new Element('span', {'class': 'b'}).injectAfter(this.currentTitle);
				this.currentProcess = new Element('span', {'class': 'b', 'text': ' '+Lang[this.status.getElement('input.resizePictures').get('checked') ? 'resize' : 'process']}).injectAfter(this.currentTitle);
			}
			
			var text = this.currentDots.get('text');
			
			if(text.length>3) text = '.';
			else if(text.length==3) text += ' ';
			else text += '.';
			
			this.currentDots.set('text', text);
		}).periodical(500, this);
	},

	removeFile: function(file) {
		var remove = this.options.fileRemove || this.fileRemove;
		if (!file) {
			this.files.each(remove, this);
			this.files.empty();
			this.updateOverall(0);
		} else {
			if (!file.element) file = this.getFile(file);
			this.files.erase(file);
			remove.call(this, file);
			this.updateOverall(this.bytesTotal - file.size);
		}
		this.parent(file);
	},

	getFile: function(file) {
		var ret = null;
		this.files.some(function(value) {
			if ((value.name != file.name) || (value.size != file.size)) return false;
			ret = value;
			return true;
		});
		return ret;
	},

	countFiles: function() {
		var ret = 0;
		for (var i = 0, j = this.files.length; i < j; i++) {
			if (!this.files[i].finished) ret++;
		}
		return ret;
	},

	updateOverall: function(bytesTotal) {
		this.bytesTotal = bytesTotal;
		this.overallTitle.set('html', Lang.overallprogress+' (' + this.sizeToKB(bytesTotal) + ')');
	},

	finishFile: function(file) {
		file = this.getFile(file);
		file.element.removeClass('file-uploading');
		file.finished = true;
		return file;
	},

	fileCreate: function(file) {
		if(this.list.getStyle('visibility')!='visible') this.list.fade(1);
		
		file.info = new Element('span', {'class': 'file-info', opacity: 0});
		file.element = new Element('li', {'class': 'file'}).adopt(
			new Element('a', {
				href: '#',
				events: {
					click: function(e){
						e.stop();
					}
				}
			}).adopt([
				new Asset.image('BrowserIcons/Icons/destroy.png', {'class': 'file-cross', title: Lang.destroy}).addClass('browser-icon').addEvent('click', (function(e){
					e.stop();
					this.removeFile(file);
				}).bind(this)),
				new Asset.image('BrowserIcons/'+file.type.substr(1)+'.png', {
					onerror: function(){
						new Asset.image('BrowserIcons/default.png').replaces(this);
					}
				}),
				new Element('span', {'class': 'file-name', 'html': file.name})
			]),
			file.info
		).inject(this.list);
	},

	fileComplete: function(file, response) {
		this.options.processResponse || this
		var json = $H(JSON.decode(response, true));
		if (json.get('result') == 'success') {
			file.element.getElement('img.file-cross').fade(0).get('tween').chain(function(){
				this.element.destroy();
			});
			file.element.getElement('a').morph('a.file-success');
			file.info.removeClass('failed').setStyle('display', 'block').set('html', json.get('size')).fade(1);
		} else {
			file.element.addClass('file-failed');
			file.info.addClass('failed').setStyle('display', 'block').set('html', json.get('error') || response).fade(1);
		}
	},

	fileError: function(file, error, info) {
		file.element.addClass('file-failed');
		file.info.addClass('failed').setStyle('display', 'block').set('html', error + '<br />' + info).fade(1);
	},

	fileRemove: function(file) {
		file.element.fade('out').retrieve('tween').chain(Element.destroy.bind(Element, file.element));
		
		if(this.list.getChildren().length==1) this.list.fade(0);
	},

	sizeToKB: function(size) {
		var unit = 'B';
		if ((size / 1048576) > 1) {
			unit = 'MB';
			size /= 1048576;
		} else if ((size / 1024) > 1) {
			unit = 'KB';
			size /= 1024;
		}
		return size.round(1) + ' ' + unit;
	}

});

/**
 * @todo Clean-up, into Date.js
 */
Date.parseDuration = function(sec) {
	var units = {}, conv = Date.durations;
	for (var unit in conv) {
		var value = Math.floor(sec / conv[unit]);
		if (value) {
			units[unit] = value;
			if (!(sec -= value * conv[unit])) break;
		}
	}
	return units;
};

Date.fancyDuration = function(sec) {
	var ret = [], units = Date.parseDuration(sec);
	for (var unit in units) ret.push(units[unit] + Date.durationsAbbr[unit]);
	return ret.join(', ');
};

Date.durations = {years: 31556926, months: 2629743.83, days: 86400, hours: 3600, minutes: 60, seconds: 1, milliseconds: 0.001};
Date.durationsAbbr = {
	years: 'j',
	months: 'm',
	days: 'd',
	hours: 'h',
	minutes: 'min',
	seconds: 'sec',
	milliseconds: 'ms'
};