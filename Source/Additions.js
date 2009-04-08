(function(){
	['visibility', 'display', 'position', 'opacity'].each(function(v){
		Selectors.Pseudo[v] = function(input){
			return Element.getStyle(this, v)==input;
		}
	});
	
	Selectors.Pseudo.identifier = function(identifier){
		return Element.retrieve(this, 'identifier')==identifier;
	};
	
})();

Tips = new Class({
	
	Extends: Tips,
	
	options: {
		offsets: {x: 15, y: 0},
		onShow: function(tip, el){
			if(tip.get('opacity')==1 && tip.getStyle('visibility')=='visible') return;
			
			tip.set({
				opacity: 0,
				tween: {
					duration: 300,
					link: 'cancel'
				}
			}).tween('opacity', 1);
		},
		
		onHide: function(tip, el){
			tip.tween('opacity', 0).get('tween').chain(function(){
				tip.setStyle('left', 0);
			});
		}
	}
	
});

var Functions = {
	center: function(el, offsets){
		var scroll = document.getScroll(),
			offset = document.getSize(),
			size = el.getSize();
		
		if(!offsets) offsets = {};
		Hash.each({left: 'x', top: 'y'}, function(z, i){
			el.setStyle(i, scroll[z]+(offset[z]-size[z])/2+(offsets[z] || 0));
		});
		
		return el;
	}
},
Popup = new Class({
	
	Implements: [Options, Events],
	
	options: {
		/*onConfirm: $empty,
		onDecline: $empty,*/
		onClose: function(){
			this.destroy();
			this.Overlay.Hide();
		},
		request: null,
		buttons: ['confirm', 'decline'],
		language: {}
	},
	
	initialize: function(title, text, options){
		this.setOptions(options);
		
		this.el = new Element('div', {
			'class': 'popup',
			opacity: 0,
			tween: {duration: 250}
		});
		
		this.el.adopt([
			new Element('h1', {text: title}),
			new Element('div', {text: text})
		]);
		
		if(this.options.content) this.el.adopt(this.options.content);
		
		Array.each(this.options.buttons || [], function(v){
			new Element('button', {'class': 'small '+v, text: this.options.language[v] || Lang[v]}).addEvent('click', (function(e){
				e.stop();
				
				this.fireEvent(v);
				this.fireEvent('close');
			}).bind(this)).inject(this.el);
		}, this);
		
		this.Overlay = new Overlay({
			events: {
				click: this.fireEvent.bind(this, ['close'])
			},
			styles: {
				zIndex: 1999,
				backgroundColor: '#fff'
			},
			tween: {duration: 250}
		}).Show();
		
		this.el.makeDraggable({
			handle: this.el.getElement('h1')
		});
		
		if(this.options.request) this.options.request.bind(this)().addEvents({
			request: this.load.bind(this),
			success: this.show.bind(this)
		}).post();
		else this.show();
	},
	
	load: function(){
		this.loader = new Asset.image('Images/browser_loading.gif').set('opacity', 0).addClass('loading').inject(document.body);
		
		Functions.center(this.loader);
		
		this.loader.fade(1);
	},
	
	show: function(){
		if(this.loader) this.loader.destroy();
		
		this.el.setStyle('display', 'block').inject(document.body);
		
		Functions.center(this.el).fade(1);
		
		this.scroll = (function(){
			if(!this.el) this.destroy();
			else Functions.center(this.el);
		}).bind(this);
		
		window.addEvents({
			scroll: this.scroll,
			resize: this.scroll
		});
	},
	
	destroy: function(){
		if(this.el) this.el.fade(0).get('tween').chain((function(){
			if(this.loader) this.loader.destroy();
			this.Overlay.Destroy();
			this.el.destroy();
		}).bind(this));
		
		window.removeEvent('scroll', this.scroll).removeEvent('resize', this.scroll);
	}
	
}),
Overlay = new Class({
	
	initialize: function(options){
		this.el = new Element('div', Hash.extend({
			'class': 'overlay'
		}, options || {})).inject(document.body);
	},
	
	Show: function(){
		this.el.get('tween').pause();
		
		this.objects = [];
		if(Browser.Engine.trident)
			$$('object, iframe, select').each(function(el){
				if(el.style.visibility=='visible') return;
				
				this.objects.push(el);
				el.style.visibility = 'hidden';
			}, this);
		else
			this.objects = $$('object:visibility(visible)').setStyle('visibility', 'hidden');
		
		this.el.setStyles({
			opacity: 0,
			display: 'block',
			width: document.getScrollWidth()+'px',
			height: document.getScrollHeight()+'px'
		}).fade(0.5);
		
		return this;
	},
	
	Hide: function(){
		if(this.objects)
			Array.each(this.objects, function(el){
				el.style.visibility = '';	
			});
		
		this.el.fade(0).get('tween').chain(function(){
			this.element.setStyle('display', 'none');
		});
		
		return this;
	},
	
	Destroy: function(){
		if(this.objects)
			Array.each(this.objects, function(el){
				el.style.visibility = '';	
			});
		
		this.el.destroy();
	}
	
});