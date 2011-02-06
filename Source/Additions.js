/*
---
description: FileManager Additions

authors:
  - Christoph Pojer

requires:
  core/1.3: '*'

provides:
  - filemanager.additions

license:
  MIT-style license

contains:
  - Element.appearOn: Can be used to show an element when another one is hovered: $(myElement).appearOn(myWrapper)
  - Element.center: Centers an element
  - Dialog, Overlay: Classes used by the FileManager
...
*/

(function(){

Element.implement({
  
    appearOn: function(el) {
      
      var $defined = function(obj){ return (obj != undefined); };
      
      var params = Array.link(Array.from(arguments).erase(arguments[0]), {options: Type.isObject, opacity: $defined}),
        opacity = typeOf(params.opacity) == 'array' ? [params.opacity[0] || 1, params.opacity[1] || 0] : [params.opacity || 1, 0];
      
      this.set({
        opacity: opacity[1],
        tween: params.options || {duration: 500}
      });

      $$(el).addEvents({
        mouseenter: this.fade.pass(opacity[0],this),
        mouseleave: this.fade.pass(opacity[1],this)
      });
      
      return this;
    },
  
  center: function(offsets){
    var scroll = document.getScroll(),
      offset = document.getSize(),
      size = this.getSize(),
      values = {x: 'left', y: 'top'};
    
    if (!offsets) offsets = {};
    
    for (var z in values){
      var style = scroll[z] + (offset[z] - size[z]) / 2 + (offsets[z] || 0);
      this.setStyle(values[z], style < 10 ? 10 : style);
    }
    
    return this;
  }
  
});

this.Dialog = new Class({
  
  Implements: [Options, Events],
  
  options: {
    /*onShow: function(){},
    onOpen: function(){},
    onConfirm: function(){},
    onDecline: function(){},
    onClose: function(){},*/
    request: null,
    buttons: ['confirm', 'decline'],
    language: {}
  },
  
  initialize: function(text, options){
    this.setOptions(options);
    this.dialogOpen = false;
    
    this.el = new Element('div', {
      'class': 'dialog' + (Browser.ie ? ' dialog-engine-trident' : '') + (Browser.ie ? ' dialog-engine-trident' : '') + (Browser.ie8 ? '4' : '') + (Browser.ie9 ? '5' : ''),
      opacity: 0,
      tween: {duration: 250}
    }).adopt([
      typeOf(text) == 'string' ? new Element('div', {text: text}) : text
    ]);
    
    if(typeof this.options.content != 'undefined') {
      this.options.content.each((function(content){
        if(content && typeOf(content) == 'element') this.el.getElement('div').adopt(content);
        else if(content) this.el.getElement('div').set('html',this.el.getElement('div').get('html')+'<br>'+content);
      }).bind(this));
    }
    
    Array.each(this.options.buttons, function(v){
      new Element('button', {'class': 'dialog-' + v, text: this.options.language[v]}).addEvent('click', (function(e){
        if (e) e.stop();
        this.fireEvent(v).fireEvent('close');
        this.overlay.hide();
        this.destroy();
      }).bind(this)).inject(this.el);
    }, this);
    
    this.overlay = new Overlay({
      'class': 'overlay overlay-dialog',
      events: {click: this.fireEvent.pass('close',this)},
      tween: {duration: 250}
    });
    
    this.bound = {
      scroll: (function(){
        if (!this.el) this.destroy();
        else this.el.center();
      }).bind(this),
      keyesc: (function(e){
        if (e.key == 'esc') {
          e.stopPropagation();
          this.fireEvent('close').destroy()
        };
      }).bind(this)
    };
    
    this.show();
  },
  
  show: function(){
    this.overlay.show();
    var self = this.fireEvent('open');
    this.el.setStyle('display', 'block').inject(document.body).center().fade(1).get('tween').chain(function(){
      var button = this.element.getElement('button.dialog-confirm') || this.element.getElement('button');
      if (button) button.focus();
      self.fireEvent('show');
    });
    
    document.addEvents({
      'scroll': this.bound.scroll,
      'resize': this.bound.scroll,
      'keyup': this.bound.keyesc
    });
  },
  
  destroy: function() {    
    if (this.el)
      this.el.fade(0).get('tween').chain((function(){
        this.overlay.destroy();
        this.el.destroy();
      }).bind(this));
      
      document.removeEvent('scroll', this.bound.scroll).removeEvent('resize', this.bound.scroll).removeEvent('keyup', this.bound.keyesc);
  }
  
});

this.Overlay = new Class({
  
  initialize: function(options){
    this.el = new Element('div', Object.append({
      'class': 'overlay'
    }, options)).inject(document.body);
  },
  
  show: function(){
    this.objects = $$('object, select, embed').filter(function(el){
      return el.id == 'SwiffFileManagerUpload' || el.style.visibility == 'hidden' ? false : !!(el.style.visibility = 'hidden');
    });
    
    this.resize = (function(){
      if (!this.el) this.destroy();
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
    if (this.objects && this.objects.length)
      this.objects.each(function(el){
        el.style.visibility = 'visible';  
      });
    
    return this;
  }
  
});

})();