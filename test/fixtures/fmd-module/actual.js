/**
 * please use GBK encode
 * Author:________
 */

;
define('work_widget/hello_link', [
  'app/workwidget/script/view_widget',
  'app/workwidget/widget/hello_link/hello_link.art',
  'app/workwidget/widget/hello_link/test'
], function(View, tpl, test) {
  return View.extend({
    event: {
      'click:.hello_link-alert': function() {
        alert('µãÄáÂê');
      }
    },
    init: function(_opt) {
      if (!_opt) _opt = {};
      this._super(_opt, this, arguments);
      this.newTag('hello_link');
    },
    boot: function() {
      var self = this;
      this._super(this, arguments);

      //Í¨¹ýMBOX»ñÈ¡Êý¾Ý
      this.mbox.getData({
        postData: {
          namespace: 'myAccountInfo'
        },
        cache: false //»º´æ±¾´Î½Ó¿ÚÇëÇóµÄÊý¾Ý£¬´°¿Ú¹Ø±ÕÊ§Ð§
      }).done(function(d) {
        self.render({
          data: d,
          tpl: tpl
        });

        test.a();

        //Ôö¼Ó±êÌâ£¬Èç¹ûÄúÐèÒªµÄ»°
        self.addLabel({
          title: 'you_label_title',
          op: 'you_widget_operation',
          //ÉèÖÃ±êÌâµÄÊÂ¼þ
          evt: {
            'click': function(e) {
              e.preventDefault();
              console.log('click');
            },
            'mouseenter': function() {
              console.log('enter');
            },
            'mouseleave': function() {
                console.log('leave');
              }
              //add more
          }
        });
      });


    },

    destroy: function() {
      /*please destroy you Widget at here[start]*/
      /*please destroy you Widget at here[end]*/
      /*----------------*/
      this._super(this, arguments);
    }
  });
});
