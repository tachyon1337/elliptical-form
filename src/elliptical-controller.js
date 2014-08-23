/*
 * =============================================================
 * elliptical-controller  v0.9.1
 * =============================================================
 * Copyright (c) 2014 S.Francis, MIS Interactive
 * Licensed MIT
 *
 * dependencies:
 * elliptical-template
 * elliptical-pubsub
 *
 * elliptical controller: the elliptical UI factory
 *
 */

//umd pattern

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        //commonjs
        module.exports = factory(require('elliptical-template'),require('elliptical-pubsub'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['elliptical-template','elliptical-pubsub'], factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
    }
}(this, function () {
    var utils= $.elliptical.utils;
    var _=utils._;

    /* custom elements flag, selector definitions */
    var DataSelector_='[data-controller]';
    var Selector_='ui-controller';



    /**
     * define $.elliptical.controller...$.elliptical.controller will the base Object used by $.controller
     */
    $.element('elliptical.controller','ui-controller',[$.elliptical.template, $.elliptical.pubsub],{

        options:{
            context:null, //$$.elliptical.context
            scope:null,  //prop of context to bind
            dataBind:true
        },

        /**
         * $.controller setup on $.element's init event
         * @private
         */
        _initElement:function(){
            var context=this.options.context;
            if(!context){
                context=window.$$.elliptical.context;
                if(context){
                    this.options.context=context;
                }
            }

            this._data.hasObserve= $.elliptical.hasObjectObserve;
            this.$viewBag=context;
            this.__setScope();
            this.__onPreInit();
            this._initController();//initController is $.controller's init event
            this.__subscriber();
            this.__publisher();

        },

        /**
         * if a scope property has been declared, auto set the instance $scope; if a scope
         * property has not been declared, it is up the dev to set the $scope in the _initController event
         * @private
         */
        __setScope: function(){
            var context=this.options.context,//context attached to $$.elliptical.context
                scopeProp=this.options.scope; //context property to bind to the instance $scope

            if(this.$scope && scopeProp && context){
                this.$scope[scopeProp]=context[scopeProp];
            }

        },

        /**
         * $.controller init event
         */
        _initController: $.noop,


        /**
         * sets up pre-defined subscribe events on a defined channel
         * @private
         */
        __subscriber:function(){
            var self=this;
            var channel=this.options.channel;
            var event=this.options.event;
            this._data._synced=false;
            if(channel){
                if(event==='sync'){
                    this._subscribe(channel +'.sync',function(data){
                        if(!self._data._synced){
                            self._data._synced=true;
                            self.__disposeTemplate();
                            self.__destroyObservable();
                            self.$scope=data.$scope;
                            self.__setObservable();
                            self.__rebindTemplate();
                            self.__onSyncSubscribe(data.proto);
                        }

                    });
                }

                this._subscribe(channel + '.add',function(data){
                    self.__onAddSubscribe(data);
                });

                this._subscribe(channel + '.remove',function(data){
                    self.__onRemoveSubscribe(data);
                });

                this._subscribe(channel + '.change',function(data){
                    self.__onChangeSubscribe(data);
                });

                this._subscribe(channel + '.select',function(data){
                    self.__onSelectSubscribe(data);
                });
            }
        },

        /**
         * if a channel has been declared, publish the $scope to channel.sync
         * this allows different $.controllers and custom elements to share the same $scope
         * @private
         */
        __publisher:function(){
            var channel=this.options.channel;
            var event =this.options.event;
            var self=this;
            if(channel && !event){
                if(this._data.scopeObserver){
                    this._publish(channel + '.sync',{proto:this,$scope:this.$scope});
                }else{
                    var timeoutId=setInterval(function(){
                        if(self._data.scopeObserver){
                            clearInterval(timeoutId);
                            self._publish(channel + '.sync',{proto:self,$scope:self.$scope});
                        }
                    },500);
                }
            }
        },

        /**
         * publishes events to the declared channel and then executes this_super()
         * to fire parent __onScopeChange handler
         * @param result
         * @private
         */
        __onScopeChange:function(result){
            if(this._data._discard){
                return false;
            }
            var self=this;
            var event =this.options.event;
            if(result.added && result.added.length){
                result.added.forEach(function(obj){
                    var channel=self.options.channel;
                    if(channel && channel !==undefined && event !=='sync'){
                        self._publish(channel + '.add',obj);
                    }
                });
            }

            if(result.removed && result.removed.length){
                result.removed.forEach(function(obj){
                    var channel=self.options.channel;
                    if(channel && channel !==undefined && event !=='sync'){
                        self._publish(channel + '.remove',obj);
                    }
                });
            }

            if(result.changed && result.changed.length){
                result.changed.forEach(function(obj){
                    var channel=self.options.channel;
                    if(channel && channel !==undefined && event !=='sync'){
                        self._publish(channel + '.change',obj);
                    }
                });
            }

            this.__$scopePropsChange(result);
            this._super(result);

            return true;
        },

        /**
         * shortcut for returning the changed $scope object props
         * useful for model objects, but not model lists
         * @param result {Array}
         * @private
         */
        __$scopePropsChange: function(result){
            var changed_=this._objectChange;
            var hasObserve=this._data.hasObserve;
            var propsChange=this._$scopePropsChange.bind(this);
            if(result.changed && result.changed.length){
                result.changed.forEach(function(obj){
                    var changed={};
                    if(hasObserve){
                        changed[obj.name]=obj.value;
                    }else{
                        changed=changed_(obj);
                    }
                    propsChange(changed);
                });
            }
        },

        _$scopePropsChange: $.noop,

        /**
         * returns the elliptical viewBag
         * @returns {*}
         * @private
         */
        _viewBag:function(){
            return $$.elliptical.context;
        },

        /**
         * trigger event
         * @param evt {String}
         * @param data {Object}
         * @private
         */
        _triggerEvent:function(evt,data){
            var Event= $.Event(evt);
            $(window).trigger(Event,data);
        },

        /**
         * component handler for channel.sync subscription
         * @param data {Object}
         * @component
         */
        __onSyncSubscribe: function(data){
            this._onSyncSubscribe(data);
        },

        /**
         * handler for channel.sync, subscription
         * @param data {Object}
         * @private
         */
        _onSyncSubscribe: $.noop,

        /**
         * component handler for channel.add subscription
         * @param data {Object}
         * @component
         */
        __onAddSubscribe: function(data){
            this._onAddSubscribe(data);
        },

        /**
         * handler for channel.add subscription
         * @param data {Object}
         * @private
         */
        _onAddSubscribe: $.noop,

        /**
         * component handler for channel.change subscription
         * @param data {Object}
         * @component
         */
        __onChangeSubscribe: function(data){
            this._onChangeSubscribe(data);
        },

        /**
         * handler for channel.change subscription
         * @param data {Object}
         * @private
         */
        _onChangeSubscribe: $.noop,

        /**
         * component handler for channel.remove subscription
         * @param data {Object}
         * @component
         */
        __onRemoveSubscribe: function(data){
            this._onRemoveSubscribe(data);
        },

        /**
         * component handler for channel.remove subscription
         * @param id {String}
         * @private
         */

        _onRemoveSubscribe: $.noop,


        /**
         * channel.select subscription
         * @param data {Object}
         * @component
         */
        __onSelectSubscribe: function(data){
            var result;
            if(data.id && this.__isModelList()){
                result= utils.selectObjectByIdFromArrayProp(this.$scope,this._data.scopeId,data.id);
            }else{
                result= undefined;
            }
            this._onSelectSubscribe(result);
        },

        /**
         * component handler for channel.select subscription
         * @param id {Object}
         * @component
         */
        _onSelectSubscribe: $.noop,

        /**
         * returns the scope property of the ViewBag context(options.context)
         * @returns {Object}
         * @private
         */
        _scopedContextModel:function(){
            var context=this.options.context,
                scopeProp=this.options.scope;

            return (scopeProp && context) ? context[scopeProp] : undefined;
        },


        _dispose: $.noop,

        scope:function(){
            return this.$scope;
        }



    });

    /**
     * define the factory
     * @param ElementProto {Object} <optional>, only should be supplied if the element not derived from HTMLElement
     * @param name {String}
     * @param tagName {String} <optional>
     * @param base {Object} <optional>
     * @param prototype {Object}
     */
    $.controller = function (ElementProto,name,tagName, base, prototype) {
        var baseObject;
        var tagName_=null;
        var ElementProto_=null;

        /* support 2-5 params */
        var length=arguments.length;
        if(length < 2){
            throw "Error: Controller requires a minimum of two parameter types: string name and a singleton for the prototype"
        }else if(length===2){

            prototype = name;
            if(typeof ElementProto==='object'){
                throw "Error: Controller requires a string name parameter";
            }
            if(typeof name!=='object'){
                throw "Error: Controller requires a singleton for the prototype";
            }
            name=ElementProto;
            baseObject = $.elliptical.controller;
            base=null;
        }else if(length===3){

            prototype=tagName;
            if(typeof ElementProto==='object'){
                if(typeof name!=='string'){
                    throw "Error: Controller requires a string name parameter";
                }
                if(typeof tagName!=='object'){
                    throw "Error: Controller requires a singleton for the prototype";
                }

                ElementProto_=ElementProto;
                baseObject = $.elliptical.controller;
                base=null;
            }else{
                if(typeof tagName==='object'){
                    if(typeof name==='string'){
                        tagName_=name;
                        baseObject = $.elliptical.controller;
                        base=null;
                    }else{
                        base=name;
                    }
                    name=ElementProto;
                }else{
                    throw "Error: Controller requires a singleton for the prototype";
                }
            }


        }else if(length===4){

            prototype=base;
            if(typeof ElementProto==='object'){
                ElementProto_=ElementProto;
                if(typeof name!=='string'){
                    throw "Error: Element requires a string name parameter";
                }
                if(typeof tagName==='string'){
                    tagName_=tagName;
                    baseObject = $.elliptical.controller;
                    base=null;
                }else{
                    base=tagName;
                }
            }else{
                base=tagName;
                tagName_=name;
                name=ElementProto;
            }
        }else{

            ElementProto_=ElementProto;
            tagName_=tagName;

        }

        if(base){
            var initFunc=[];
            /* controller inheritance creates a callstack for the parent  _init event,written to an array on the element prototype,
             so they get fired in sequence, avoiding being overwritten by the element's _initController event
             */
            if($.utils.array.isArray(base)){ /* support passing in array of base elements, not just one */
                /* array */

                /* setup baseObject constructor */
                baseObject = function () {};
                baseObject._childConstructors = [];

                /* iterate and extend */
                base.forEach(function(obj){
                    /* obj.__initFunc array of _initController gets concat'ed to the new stack */
                    if(obj.prototype.__initFunc && obj.prototype.__initFunc.length > 0){
                        initFunc=initFunc.concat(obj.prototype.__initFunc);
                    }
                    $.extend(baseObject.prototype, obj.prototype, $.elliptical.controller.prototype);
                    /* push obj _initController or initElement onto initFunc stack */
                    if(obj.prototype._initController){
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
                    initFunc.push(baseObject.prototype._initController);
                } else {
                    /* base is not derived from controller, so extend onto a baseObject constructor */
                    baseObject = function () {};
                    baseObject._childConstructors = [];
                    if(base.prototype._initElement){
                        initFunc.push(base.prototype._initElement);
                    }
                    $.extend(baseObject.prototype, base.prototype, $.elliptical.controller.prototype);

                }

                if(initFunc.length > 0){
                    prototype.__initFunc=initFunc;
                }
            }
        }



        /* implement using the extended jQuery UI factory */
        $.widget(name, baseObject, prototype);



        /* register the element as a custom element, if enabled */
        if($.element.custom){
            if(!tagName_){
                tagName_=name.replace('.','-');
            }
            var name_= name.split( "." )[ 1 ];
            if(!ElementProto_){
                var __proto__=HTMLElement.prototype;
                __proto__._name='HTMLElement';
                ElementProto_=__proto__;
            }
            $.element.register(name_,tagName_,ElementProto_);


        }
    };


    /* copy props of element to controller */
    for(var key in $.element){
        $.controller[key]= $.element[key];
    }


    /* setup observer for ui-controller,data-controller instantiations on added mutations */
    $(function(){
        $(document).on('ellipsis.onMutation',function(event,data){
            var mutations=data.mutations;
            mutations.forEach(function (mutation) {
                var added=mutation.addedNodes;
                if(added.length>0){
                    /* support data-controller and ui-controller */
                    var dataUi=$(added).selfFind(DataSelector_);
                    if(dataUi && dataUi.length >0){
                        //html5 mode, the only selector is data-controller
                        instantiateControllers(dataUi,'data-controller');
                    }

                    if($.element.custom){
                        var ui=$(added).selfFind(Selector_);
                        if(ui && ui.length >0){
                            //for base ui-controller tag, <ui-controller name=""></ui-controller>
                            instantiateControllers(ui,'name');
                        }
                        var ctrl=$(added).selfFind('[controller]');
                        if(ctrl && ctrl.length > 0){
                            //previously registered custom elements not tied to $.controller
                            //<ui-tabs><tabbed-content><tab-content controller=""></tab-content></tabbed-content></ui-tabs>
                            instantiateControllers(ctrl,'controller');
                        }
                    }
                }
            });
        });
    });

    //for page loads
    (function(){
        document.addEventListener('WebComponentsReady', function() {
            /* support data-controller and ui-controller */
            var dataUi = $(document).find(DataSelector_);
            var ui,ctrl;
            if($.element.custom){
                ui = $(document).find(Selector_);
                ctrl=$(document).find('[controller]');
            }
            if(dataUi && dataUi.length >0){
                instantiateControllers(dataUi,'data-controller');
            }
            if($.element.custom && ui && ui.length > 0){
                instantiateControllers(ui,'name');
            }
            if($.element.custom && ctrl && ctrl.length > 0){
                instantiateControllers(ctrl,'controller');
            }
        });

    })();



    /* instantiate controllers from jQuery Array */
    function instantiateControllers(ui,attrSelector){
        $.each(ui,function(){
            var context=window.$$.elliptical.context;
            var controller= $(this).attr(attrSelector);
            if(controller !==undefined){
                controller=controller.toCamelCase();
            }
            var camelCase =($.element.custom) ? $(this).attr('camel-case') : $(this).attr('data-camel-case');
            if(camelCase===undefined){
                camelCase=true;
            }
            var opts= $.element.getOpts(this,camelCase);
            if(context){
                opts.context=context;
            }
            $(this)[controller](opts);
        });
    }

    /* delete controller from custom element definitions,
       since we are already separately binding ui-controller instantiations to mutation observer changes

       this prevents each <ui-controller name=""></ui> from having two instances, a ".name" instance and a ".controller" instance

     */
    if($.element.custom){
        var definitions_=$.element.definitions;
        var len_=definitions_.length;
        for(var i=0;i<len_;i++){
            if(definitions_[i].name==='controller'){
                definitions_.splice(i,1);
            }
        }
    }



    return $;

}));