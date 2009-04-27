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
};