FileManager.implement({
	
	options: {
		upload: true,
		uploadAuthData: {}
	},
	
	hooks: {
		initialize: {
			upload: function(){
				if(this.options.upload) this.addMenuButton('upload');
			}
		},
		
		show: {
			upload: function(options){
				if(options.upload) this.showUpload = true;
			}
		},
		
		load: {
			upload: function(){
				if(this.showUpload) this.upload();
			}
		}
	},
	
	upload: function(e){
		if(e) e.stop();
		if(!this.options.upload) return;

		var fallback = new Element('span', {'class': 'leftm topm', html: this.language.flash}),
			self = this;

		this.showUpload = false;
		this.fillInfo();
		this.info.getElement('h2.filemanager-headline').setStyle('display', 'none');
		this.preview.empty().adopt([
			new Element('h2', {text: this.language.upload}),
			fallback,
			FancyUpload2.Start({
				/*filter: this.options.filter,*/
				url: this.options.url+Hash.toQueryString($merge({}, this.options.uploadAuthData, {
					event: 'upload',
					directory: this.normalize(this.Directory)
				})),
				onAllComplete: function(){
					self.load(self.Directory, true);
					(function(){
						this.removeFile();
					}).delay(5000, this);
				},
				onLoad: function(){
					fallback.destroy();
				}
			})
		]);
	}
	
});

/*
FancyUpload2.Start = function(options){
	var container = new Element('div', {'class': 'uploader'}),
		el = new Element('div');
		list = new Element('ul', {'class': 'uploader-list', opacity: 0});

	['overall', 'current'].each(function(v){
		new Element('div', {'class': 'clear'}).adopt([
			new Element('span', {'class': 'b '+v+'-title', text: Lang[v+'progress']}),
			new Element('br'),
			new Asset.image('Assets/bar.gif').addClass('progress').addClass(v+'-progress')
		]).inject(el);
	});

	new Element('div', {'class': 'current-text'}).inject(el);
	
	var filter = {};
	if(options.filter) filter[Lang.img] = '*.jpg; *.jpeg; *.gif; *.png';
	
	var button = new Element('button', {text: Lang.browse}),
		swiffy = new FancyUpload2(el, list, Hash.extend({
			path: 'Assets/Swiff.Uploader.swf',
			limitFiles: 0,
			target: button,
			typeFilter: filter
		}, options));

	$$(
		new Element('label', {'class': 'uploadLabel'}).adopt(
			new Element('input', {'class': 'resizePictures', name: 'resizePictures1', type: 'checkbox', checked: 'checked'}).addClass('checkbox'),
			new Element('span', {text: Lang.resizePictures})
		),

		new Element('button', {text: Lang.startupload}).addEvent('click', function(e){
			e.stop();
			swiffy.upload({
				addUrl: '&resize='+(el.getElement('input.resizePictures').get('checked') ? 1 : 0)
			});
		}),

		new Element('button', {'class': 'small', text: Lang.clear}).addEvent('click', function(e){
			e.stop();
			swiffy.removeFile();
		}),

		button.addEvent('click', function(e){
			e.stop();

			swiffy.browse();
		})
	).injectTop(el);

	return container.adopt(el, list);
};*/