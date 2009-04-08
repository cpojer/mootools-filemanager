/*
 * TODO: Fix Popup Language-Stuff
 *
 */

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

Element.implement({
	
	center: function(offsets){
		var scroll = document.getScroll(),
			offset = document.getSize(),
			size = this.getSize(),
			values = {left: 'x', top: 'y'};
		
		if(!offsets) offsets = {};
		
		for(z in values) this.setStyle(z, scroll[values[z]]+(offset[values[z]]-size[values[z]])/2+(offsets[values[z]] || 0));
		
		return this;
	}
	
});

Popup = new Class({
	
	Implements: [Options, Events],
	
	options: {
		/*onConfirm: $empty,
		onDecline: $empty,*/
		onClose: function(){
			this.destroy();
			this.overlay.hide();
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
		}).adopt([
			new Element('h1', {text: title}),
			new Element('div', {text: text})
		]);
		
		this.el.makeDraggable({
			handle: this.el.getElement('h1')
		});
		
		if(this.options.content) this.el.adopt(this.options.content);
		
		Array.each(this.options.buttons, function(v){
			new Element('button', {'class': 'popup-'+v, text: this.options.language[v] || Lang[v]}).addEvent('click', (function(e){
				e.stop();
				this.fireEvent(v).fireEvent('close');
			}).bind(this)).inject(this.el);
		}, this);
		
		this.overlay = new Overlay({
			events: {
				click: this.fireEvent.bind(this, ['close'])
			},
			styles: {
				zIndex: 1999,
				backgroundColor: '#fff'
			},
			tween: {duration: 250}
		});
		
		this.show();
	},
	
	show: function(){
		this.overlay.show();
		this.el.setStyle('display', 'block').inject(document.body).center().fade(1);
		
		this.scroll = (function(){
			if(!this.el) this.destroy();
			else this.el.center();
		}).bind(this);
		
		window.addEvents({
			scroll: this.scroll,
			resize: this.scroll
		});
	},
	
	destroy: function(){
		if(this.el) this.el.fade(0).get('tween').chain((function(){
			this.overlay.destroy();
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
	
	show: function(){
		this.objects = [];
		['object', Browser.Engine.trident ? 'select' : 'embed'].each(function(tag){
			this.objects = Array.filter(document.getElementsByTagName(tag), function(el){
				return el.style.visibility=='hidden' ? false : el.style.visibility = 'hidden';
			});
		}, this);
		
		this.el.get('tween').pause();
		this.el.setStyles({
			opacity: 0,
			display: 'block',
			width: document.getScrollWidth(),
			height: document.getScrollHeight()
		}).fade(0.5);
		
		return this;
	},
	
	hide: function(){
		this.el.fade(0).get('tween').chain((function(){
			this.revertObjects();
			this.el.setStyle('display', 'none');
		}).bind(this));
		
		return this;
	},
	
	destroy: function(){
		this.revertObjects().el.destroy();
	},
	
	revertObjects: function(){
		if(this.objects && this.objects.length)
			this.objects.each(function(el){
				el.style.visibility = 'visible';	
			});
		
		return this;
	}
	
});