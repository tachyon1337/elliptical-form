/*
 * =============================================================
 * elliptical-form
 * =============================================================
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-controller'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-controller'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    var utils= $.elliptical.utils;
    var _=utils._;

    /* customElements object */
    var Selector_='[data-form]';
    var customElements_=false;
    if($('html').hasClass('customelements')){
        Selector_='ui-form';
        customElements_=true;
    }


    $.controller('elliptical.form','ui-form',{

        _initController:function(){
            this._initForm();
        },

        _initForm:function(){

        },

        /**
         *
         * @private
         */
        __getTemplateNode:function(){
            return this.element.find('form');
        },

        /**
         * renders the template fragment directly using the $scope
         * @param $scope {Object}
         * @param callback {Function}
         * @private
         */
        __render: function($scope,callback){
            var opts={};
            opts.template=this._data.templateId;
            if(this.__isModelList()){
                var prop=Object.keys($scope)[0];
                opts.model=$scope[prop];
                opts.context=prop;
            }else{
                opts.model=$scope;
            }

            opts.parse=false;
            this.__renderTemplate(opts,callback);
        },

        /**
         *
         * @param opts {Object}
         * @param callback {Function}
         * @private
         */
        __renderTemplate:function(opts,callback){
            var self=this;
            this._renderTemplate(opts,function(err,out){
                var html=out.replace(/<form(.*?)>/g,'').replace(/<\/form>/g,'');
                self._data.templateNode.html(html);
                if(callback){
                    callback(err,out);
                }
            });
        },

        $render:function(model,context,callback){
            if(typeof context==='function'){
                callback=context;
                context=undefined;
            }
            var opts={};
            opts.parse=false;
            opts.template=this._data.templateId;
            opts.model=model;
            //opts.context=context;
            this.__renderTemplate(opts,callback);
        }

    });


    /**
     * define the factory

     * @param name {String}
     * @param tagName {String}
     * @param base {Object} <optional>
     * @param prototype {Object}
     */
    $.form = function (name,tagName,base, prototype) {
        var baseObject;
        var tagName_=null;
        /* support 2-4 params */
        var length=arguments.length;
        if(length < 2) {
            throw "Error: Form requires a minimum of two parameter types: string name and a singleton for the prototype";
        }else if(typeof name !=='string'){
            throw "Error: Form requires name of type string";
        }else if(length===2){
            if(typeof name==='string' && typeof tagName==='string'){
                throw "Error: Form requires a minimum of two parameter types: string name and a singleton for the prototype";
            }
            prototype = tagName;
            baseObject = $.elliptical.form;
            base=null;
        }else if(length===3){
            if(typeof name==='string' && typeof tagName==='string'){
                tagName_=tagName;
                prototype = base;
                baseObject = $.elliptical.form;
                base=null;
            }else{
                prototype=base;
                base=tagName;
            }
        }else if(length===4){
            tagName_=tagName;
        }

        if(base){
            var initFunc=[];
            /* controller inheritance creates a callstack for the parent form _initForm event,written to an array on the element prototype,
             so they get fired in sequence, avoiding being overwritten by the element's _initForm event
             */
            if($.utils.array.isArray(base)){ /* support passing in array of base elements, not just one */
                /* array */

                /* setup baseObject constructor */
                baseObject = function () {};
                baseObject._childConstructors = [];

                /* iterate and extend */
                base.forEach(function(obj){
                    /* obj.__initFunc array of _initForm gets concat'ed to the new stack */
                    if(obj.prototype.__initFunc && obj.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(obj.prototype.__initFunc);
                    }
                    $.extend(baseObject.prototype, obj.prototype, $.elliptical.form.prototype);
                    /* push obj _initForm or _initController or _initElement onto initFunc stack */
                    if(obj.prototype._initForm){
                        initFunc.push(obj.prototype._initForm);
                    }else if(obj.prototype._initController){
                        initFunc.push(obj.prototype._initController);
                    }else if(obj.prototype._initElement){
                        initFunc.push(obj.prototype._initElement);
                    }
                });

                /* attach the stack to the prototype */
                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }

            }else{
                /* object */
                if (base.prototype._initController) {
                    baseObject = base;
                    if(baseObject.prototype.__initFunc && baseObject.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(baseObject.prototype.__initFunc);
                    }
                    initFunc.push(baseObject.prototype._initForm);
                } else {
                    /* base is not derived from element, so extend onto a baseObject constructor */
                    baseObject = function () {};
                    baseObject._childConstructors = [];
                    if(base.prototype._initController){
                        initFunc.push(base.prototype._initController);
                    }else if(base.prototype._initElement){
                        initFunc.push(base.prototype._initElement);
                    }
                    $.extend(baseObject.prototype, base.prototype, $.elliptical.form.prototype);
                }

                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }
            }
        }

        /* implement using the extended jQuery UI factory */
        $.widget(name, baseObject, prototype);

        /* register the element as a custom element, if enabled */
        if(customElements_){
            if(!tagName_){
                tagName_=name.replace('.','-');
            }
            var name_= name.split( "." )[ 1 ];

            $.widget.register(name_,tagName_,HTMLElement.prototype,false);
        }
    };

    //register ui-form as custom element
    if(customElements_){
        try{
            //$.widget.registerElement('ui-form');
            /* make public props/methods available on $.form */
            for(var key in $.controller){
                $.form[key]= $.controller[key];
            }
        }catch(ex){

        }
    }

    /* register a document listener for ellipsis.onMutation */
    $(function(){
        $(document).on('ellipsis.onMutation',function(event,data){
            var mutations=data.mutations;
            mutations.forEach(function (mutation) {
                var added=mutation.addedNodes;
                if(added.length>0){
                    /* support data-form and ui-form */
                    var ui=$(added).selfFind(Selector_);
                    if(ui && ui.length > 0){
                        instantiateForms(ui);
                    }
                }
            });
        });
    });


    //for page loads
    (function(){
        document.addEventListener('WebComponentsReady', function() {
            var ui = $(document).find(Selector_);
            if(ui && ui.length > 0){
                instantiateForms(ui);
            }
        });
    })();

    /* instantiate forms from jQuery Array */
    function instantiateForms(ui){
        $.each(ui,function(){
            var form=(customElements_) ? $(this).attr('name') : $(this).attr('data-form');
            if(form !==undefined){
                form=form.toCamelCase();
            }
            var camelCase =($.element.custom) ? $(this).attr('camel-case') : $(this).attr('data-camel-case');
            if(camelCase===undefined){
                camelCase=true;
            }
            var opts= $.widget.getOpts(this,camelCase);
            $(this)[form](opts);

        });
    }

    /* delete form from custom element definitions,
     since we are already separately binding ui-form instantiations to mutation observer changes

     this prevents each <ui-form name=""></ui> from having two instances, a ".name" instance and a ".form" instance

     */
    if($.element.custom){
        var definitions_=$.element.definitions;
        var len_=definitions_.length;
        for(var i=0;i<len_;i++){
            if(definitions_[i].name==='form'){
                definitions_.splice(i,1);
            }
        }
    }

    return $;

}));
