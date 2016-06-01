/*
 *前端分页处理插件
 *fulong@jiaju.com
 *2016-03-21
*/
(function ($) {
  $.tools = $.tools || {version: '1.0'};
  $.tools.myPages = {
      targetDom:null,//mustbe 显示数据内容
      tpl:null, //mustbe 翻页内容模板 '<li><span>{title}</span><label>{keywords}</label></li>'
      currPage:1,
      totalPage:0,//总页数
      pageSize:5,//显示几个 页码
      listSize:5,//列表数据 每一页有几条，source 为数组时 必须。
      pageDatas:{},//缓存页面请求过的数据
      currData:null,//当前页面数据
      inputToPage:true,//是否显示 输入框
      isCatchData:true,//默认开启 缓存数据
      firstResponse:true,// 默认第一页 自动渲染, false 第一页不渲染 由 系统渲染
      pageClickCallfun:null,//点击页码回调函数
      type:'GET',
      dataType:'json'
  };

  function MyPages(allelem,handle,conf,fn) {
          var that = allelem,
              self = handle,
              options = conf;

        var $wrapId = that;

        $.extend(self,{
          init: function () {
            if(!options['tpl']){ throw '分页器: 数据模板tpl是必须项'; return false; }
            
            this.tpl = options['tpl'];

            var that = this, array = [];

            if ( $.isArray(options['source']) ) {//如果数据从页面 一次性传来
              array = options['source'].slice();
              that._normalize( array );
            } else if (typeof options['source']  == 'string') {//数据从 服务接口获取
                this.source = function( request, response ) {
                  if ( that.xhr ) { that.xhr.abort(); }
                  that.xhr = $.ajax({
                    url: options.source,
                    tupe:options['type'],
                    data: request,
                    dataType: options['dataType'],
                    success: function( data ) {
                      data = that._normalize(data);
                      if ( $.isArray(data) && data.length > 0) {
                        that._catchData( data );
                        response( data );
                      } else {
                        response( [] );
                      }
                    },
                    error: function() {
                      response( {msg:'网络出错，请稍后访问。'} );
                    }
                  });
                };
            } 
            if (options['firstResponse']){ this._getData(); }
          },

          _getData: function _getData( ) {
            var currPage = options['currPage'] || 1;
            if (options['isCatchData'] && options['pageDatas']['page'+currPage]) {
              this.__response( this._getCurData() );
            } else if( $.isArray(options['source']) ) {
              this.__response( this._getCurData() );
            } else {
              this.source( this._getParameter( currPage ), this._response() );
            }
            
          },

          //获取发送ajax 的参数
          _getParameter: function _getParameter( p ) {
            if ($.isFunction(options['setParameterFun']) ) {
              return options['setParameterFun'].call(this, p);
            }
            return {page: p, p: p};
          },

          _getCurData: function _getCurData( p ) {
            var num = p || options['currPage'];
            return options['pageDatas']['page'+num];
          },

          //合并作用域
          _response: function _response() {
            return $.proxy(function( content ) {
                //console.log('_response:' + JSON.stringify( content) );
                this.__response( content );
            }, this );
          },
          //数据写入页面
          __response: function __response( data ) {
            var that = this, arrHtml = [];
            if ($.isArray(data) && data.length > 0) {
              $.map(data, function( d ) {
                arrHtml.push( that._substitute(that.tpl, d) );
              });
            } else {
              arrHtml.push( ((data && data.msg)||'暂无数据') );
            }
            $(options['targetDom']).html( arrHtml.join('') );
            this.setPages();
            this._afterResponse();
          },

          _afterResponse: function _afterResponse( opt ) {
              $wrapId.find('a').removeClass('onLoading');
              if ($.isFunction( options['afterResponse'] ) ) {
                options['afterResponse'].call(this, arguments);
              }
          },
          //初始化 ajax 返回的数据
          _normalize: function _normalize( data ) {
            if(typeof data == 'string'){ data = that._toJSON(data);}
            if ( $.isFunction( options['normalizeFun'] )) {
              data = options['normalizeFun'].call(this, data );
              options = $.extend(true, {}, options, data);
              return data.currData;
            }else if ( $.isArray(options['source']) ){//页面传来所有 数据数组形式  进行分页初始化
              var len = (data && data.length) || 0, arr = data, size = options['listSize'],
                  total = options['totalPage'] = Math.ceil(len/size);
              for (var i = 1; i<=total; i++) {
                  size = (arr.length < size) ? arr.length : size;
                  options['pageDatas']['page'+i] = ( arr.splice(0, size ) );
              }
              return this._getCurData();
            } else {
              return data;
            }
            
          },

          _substitute: function (tpl, obj) {
            return tpl.replace(/\\?\{([^{}]+)\}/g, function (match, name) {
              return (obj[name] === undefined) ? "" : obj[name];
            });
          },

          //toJSON:将字符串转换为JSON格式的对象
          _toJSON: function _toJSON(str) {
            try{return "JSON" in window ? JSON.parse(str) : eval("(" + str + ")");}catch(e) { return str;} 
          },

          //缓存数据
          _catchData: function _catchData( data ) {
            if (data && options['isCatchData']) {
              var key = 'page'+options['currPage'];
              options['pageDatas'][key] = data;
            }
          },

          hidePages: function () { $wrapId.hide(); },

          setPages: function () {
              var total = options['totalPage'],
                  pageSize = len = options['pageSize'],
                  currPage = options['currPage'] - 0,
                  cls = '',
                  arrHtml = ['<span class="pages-in" data-role="pages-in">'];

              if (total && total > 1) {
                if (currPage > 1){ arrHtml.push( '<a class="prev" href="javascript:void(0);" >上一页</a>' );}
                //console.log('currPage:'+currPage);
                //前省略号
                if (total > pageSize && currPage > (parseInt(pageSize/2 +0.5)) ){ arrHtml.push( '<a href="javascript:void(0);" p="1" >1</a> ...' );}

                if ((currPage+len) > total) { len = total; }

                for (var i=0;i<len;i++ ) {
                  var n = (i+currPage) - (parseInt(pageSize/2));

                  if (n > total || n < 1) {
                    continue;
                  }
                  //当前页码 加上 高亮样式
                  if ( n == currPage) { cls = 'cur';}else{cls = ' ';}
                  arrHtml.push('<a class="'+cls+'" href="javascript:void(0);" p='+n+' >'+n+'</a>');
                }
                //后省略号 还有下一页 显示
                if ( total > pageSize && currPage < total) {
                  arrHtml.push('... <a href="javascript:void(0);"  p='+total+' >'+total+'</a>');
                  arrHtml.push('<a class="next" href="javascript:void(0);" >下一页</a>');
                }

                arrHtml.push('</span>');
                //加入输入框 
                if (total > pageSize && options['inputToPage']) {
                  arrHtml.push('<span class="pages-to" data-role="pages-to"><span class="inputWrap"> 到 <input type="text" data-role="page-text" /> 页 </span> <a class="ok-btn" href="javascript:void(0);" >确定</a> </span>');
                }

                self.html( arrHtml.join('') );
              } else {
                self.hidePages();
              }
          }

        });

        //pages 分页
        $wrapId.on('click', 'a', function() {
          var t = $(this).attr('p');
          if ($(this).hasClass('cur') || $(this).hasClass('onLoading')) {
            return false;
          }
          //点击上一页
          if ($(this).hasClass('prev')) {
            //第一页 不执行上一页
            if (options['currPage'] == 1) {
              $(this).addClass('none');
              return false;
            }
            options['currPage'] = options['currPage'] - 1;
            //点击下一页
          } else if ($(this).hasClass('next')) {
            //最后一页 不执行下一页
            if (options['currPage'] >= options['totalPage']) {
              $(this).addClass('none');
              return false;
            }
            options['currPage'] = (options['currPage'] - 0) + 1;
            //输入框 页码 确定
          } else if ($(this).hasClass('ok-btn')) {
            var n = parseInt( $wrapId.find('[data-role=page-text]').val() );
            //输入数据必须 大于 0
            if (n && typeof(n) == 'number' && n > 0) {
              //输入 数字范围 要小于 总页数
              if (n <= options['totalPage']) {
                options['currPage'] = n;
              } else {
                $wrapId.find('[data-role=page-text]').val('');
                return false;
              }
            } else {
              $wrapId.find('[data-role=page-text]').val('');
              return false;
            }
          } else {
            options['currPage'] = t;
          }
          $(this).addClass('onLoading');
          self._getData();
          return false;
        });
  };

  $.fn.myPages = function(options, fn) {
    var el = this.data('myPages');
    if (el) { return; }
    if ($.isFunction(options)) {
      fn = options;
      options = $.extend({}, $.tools.myPages);
    } else {
      options = $.extend({}, $.tools.myPages, options);
    }

    var that = this;
    this.each(function() {
      var self = $(this);
      el = new MyPages(that, self, options, fn);
      self.init();
      self.data("myPages", self);
      if ($.isFunction(fn)) {
        fn(options, self);
      }
    });
    return el;
  };

})((typeof(jQuery) != 'undefined' && jQuery) || (typeof(Zepto) != 'undefined' && Zepto) || $);