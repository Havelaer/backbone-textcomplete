// Phrase model

var Phrase = Backbone.Model.extend({

  defaults : {
    type: 'text'
  },

  toHTML: function () {
    if (this.get('type') === 'text') {
      return this.get('text');
    }
    return '<a data-type="' + this.get('type') + '" data-value="' + this.get('value') + '">' + this.get('text') + '</a>';
  }

});

// Note collection (of phrases)

var Note = Backbone.Collection.extend({

  model: Phrase,

  addChars: function (start, chars) {
    if (!chars) return this;
    this.find(function (phrase) {
      var text = phrase.get('text');
      var l = text.length;
      var textNew;

      if (start <= l) {
        textNew = text.substr(0, start) + chars + text.substr(start);
        if (phrase.get('type') !== 'text' && start === l) {
          phrase = this.add({ text: chars });
        } else {
          phrase.set('type', 'text');
          phrase.set('text', textNew);
        }
        return true;
      }

      prev = phrase;
      start -= l;
      return false;
    }, this);
    return this;
  },

  removeChars: function (start, length) {
    if (!length) return this;
    this.find(function (phrase) {
      var text = phrase.get('text');
      var textNew;
      var l = text.length;

      if (start < l) {
        textNew = text.substr(0, start) + text.substr(start + length);
        if (textNew.length === 0) {
          this.remove(phrase);
        } else {
          phrase.set('type', 'text');
          phrase.set('text', textNew);
        }
        length -= (text.length - textNew.length);
      }

      start -= l;
      return length <= 0;
    }, this);
    return this;
  },

  cleanUpTree: function () {
    var prev = null;
    var garbage = [];
    this.each(function (phrase) {
      if (prev && prev.get('type') === 'text' && phrase.get('type') === 'text') {
        prev.set('text', prev.get('text') + phrase.get('text'));
        garbage.push(phrase);
      } else {
        prev = phrase;
      }
    });
    this.remove(garbage);
    return this;
  },

  getTime: function () {
    var model = this.findWhere({ type: 'time' });
    return model ? model.get('value') : null;
  },

  getDate: function () {
    var model = this.findWhere({ type: 'date' });
    return model ? model.get('value') : null;
  },

  toHTML: function () {
    var html = this.map(function (phrase) {
      return phrase.toHTML();
    });
    return html.join('');
  },

  toPlainText: function () {
    var phrases = this.map(function (phrase) {
      return phrase.get('text');
    });
    return phrases.join('');
  }

});

var NoteView = Backbone.View.extend({

  events: {
    'click a': 'onClickLink',
    'click .note-html': 'onClickText',
    'keydown textarea': 'onType',
    'focus textarea': 'onFocus',
    'blur textarea': 'onBlur'
  },

  searchLength: 3,

  initialize: function (options) {
    this.note = options.note || new Note();
    this.endpoints = options.endpoints;
  },

  render: function () {
    this.$('textarea').val(this.note.toPlainText());
    this.updateHtml();
  },

  updateHtml: function () {
    this.$('.note-html').html(this.note.toHTML());
  },

  onType: function (e) {
    var self = this;
    var $textarea = $(e.target);
    var textBefore = $textarea.val();
    var start = $textarea[0].selectionStart;
    var end = $textarea[0].selectionEnd;
    var length = 0;

    if (e.keyCode === 27) {
      $textarea.blur();
      return;
    }

    selectedText = textBefore.substring(start, end);

    if (e.keyCode === 8 && start === end) {
      start = Math.max(start-1, 0);
    }

    if (_.contains([9, 37,38,39,40], e.keyCode)) {
      return;
    }

    length = end - start;

    textBefore = textBefore.substr(0, start) + textBefore.substr(start + length);

    setTimeout(function () {
      var textAfter = $textarea.val();
      self.note.removeChars(start, length + (textBefore.length - textAfter.length));
      var chars = textAfter.substr(start, textAfter.length - textBefore.length);
      self.note.addChars(start, chars);
      self.note.cleanUpTree();
      self.updateHtml();
    });
  },

  onFocus: function (e) {
    this.enableEdit();
  },

  onBlur: function (e) {
    this.disableEdit();
  },

  onClickText: function (e) {
    this.$('textarea').focus();
  },

  onClickLink: function (e) {
    e.stopPropagation();
  },

  enableEdit: function () {
    this.$el.addClass('note-editable');
  },

  disableEdit: function () {
    this.$el.removeClass('note-editable');
  }

});



