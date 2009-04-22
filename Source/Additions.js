/*
 * TODO: Fix Popup Language-Stuff
 *
 */

FileManager.Tips = new Class({
	
	Extends: Tips,
	
	options: {
		offsets: {x: 15, y: 0},
		text: null,
		onShow: function(tip, el){
			if(tip.get('opacity')==0.8 && tip.getStyle('visibility')=='visible') return;
			
			tip.get('tween').pause();
			tip.set({
				opacity: 0,
				tween: {
					duration: 200,
					link: 'cancel'
				}
			}).fade(0.8);
		},
		
		onHide: function(tip, el){
			tip.get('tween').pause().start('opacity', 0).chain(function(){
				tip.setStyle('left', 0);
			});
		}
	},
	
	initialize: function(el, options){
		this.parent(el, options);
		this.tip.addClass('tip-filebrowser');
	}
	
});

FileManager.Request = new Class({
	
	Extends: Request.JSON,
	
	initialize: function(options, filebrowser){
		this.parent(options);
		
		if(filebrowser)	this.addEvents({
			request: filebrowser.onRequest.bind(filebrowser),
			complete: filebrowser.onComplete.bind(filebrowser)
		});
	}
	
});

Element.implement({
	
	appearOn: function(el, opacity, options){
		opacity = $type(opacity) == 'array' ? [opacity[0] || 1, opacity[1] || 0] : [opacity || 1, 0];
		
		this.set({
			opacity: opacity[1],
			tween: options || {duration: 200}
		});
		
		$(el).addEvents({
			mouseenter: this.fade.bind(this, opacity[0]),
			mouseleave: this.fade.bind(this, opacity[1])
		});
		
		return this;
	},
	
	center: function(offsets){
		var scroll = document.getScroll(),
			offset = document.getSize(),
			size = this.getSize(),
			values = {x: 'left', y: 'top'};
		
		if(!offsets) offsets = {};
		
		for(var z in values){
			var style = scroll[z]+(offset[z]-size[z])/2+(offsets[z] || 0);
			this.setStyle(values[z], style < 10 ? 10 : style);
		}
		
		return this;
	}
	
});

var Dialog = new Class({
	
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
	
	initialize: function(text, options){
		this.setOptions(options);
		
		this.el = new Element('div', {
			'class': 'dialog',
			opacity: 0,
			tween: {duration: 250}
		}).adopt([
			new Element('div', {text: text})
		]);
		
		if(this.options.content) this.el.getElement('div').adopt(this.options.content);
		
		Array.each(this.options.buttons, function(v){
			new Element('button', {'class': 'dialog-'+v, text: this.options.language[v]}).addEvent('click', (function(e){
				e.stop();
				this.fireEvent(v).fireEvent('close');
			}).bind(this)).inject(this.el);
		}, this);
		
		this.overlay = new Overlay({
			'class': 'overlay overlay-dialog',
			events: {
				click: this.fireEvent.bind(this, ['close'])
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
		this.el = new Element('div', $extend({
			'class': 'overlay'
		}, options)).inject(document.body);
	},
	
	show: function(){
		this.objects = $$('object, select, embed').filter(function(el){
			return el.style.visibility=='hidden' ? false : el.style.visibility = 'hidden';
		});
		
		this.resize = (function(){
			if(!this.el) this.destroy();
			else this.el.setStyles({
				width: document.getScrollWidth(),
				height: document.getScrollHeight()
			});
		}).bind(this);
		
		this.resize();
		
		this.el.setStyles({
			opacity: 0,
			display: 'block'
		}).get('tween').pause().start('opacity', 0.5);
		
		window.addEvent('resize', this.resize);
		
		return this;
	},
	
	hide: function(){
		this.el.fade(0).get('tween').chain((function(){
			this.revertObjects();
			this.el.setStyle('display', 'none');
		}).bind(this));
		
		window.removeEvent('resize', this.resize);
		
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