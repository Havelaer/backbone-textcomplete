// String helpers

String.prototype.regexIndexOf = function(regex, startpos) {
  var indexOf = this.substring(startpos || 0).search(regex);
  return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
};

String.prototype.regexLastIndexOf = function(regex, startpos) {
  regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
  if(typeof (startpos) == "undefined") {
    startpos = this.length;
  } else if(startpos < 0) {
    startpos = 0;
  }
  var stringToWorkWith = this.substring(0, startpos + 1);
  var lastIndexOf = -1;
  var nextStop = 0;
  while((result = regex.exec(stringToWorkWith)) != null) {
    lastIndexOf = result.index;
    regex.lastIndex = ++nextStop;
  }
  return lastIndexOf;
};


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
    if (this.length === 0) {
      this.add({ 'text': chars });
      return this;
    }
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


// NoteView

var NoteView = Backbone.View.extend({

  events: {
    'click a': 'onClickLink',
    'click .note-html': 'onClickText',
    'keydown textarea': 'onType',
    'focus textarea': 'onFocus',
    'blur textarea': 'onBlur'
  },

  endPoints: {},

  searchLength: 2,

  initialize: function (options) {
    this.note = options.note || new Note();
    this.endPoints = options.endPoints;
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

    if (this.typing) {
      e.preventDefault();
      return true;
    }
    this.typing = true;

    length = end - start;

    textBefore = textBefore.substr(0, start) + textBefore.substr(start + length);

    setTimeout(function () {
      var textAfter = $textarea.val();
      self.note.removeChars(start, length + (textBefore.length - textAfter.length));
      var chars = textAfter.substr(start, textAfter.length - textBefore.length);
      self.note.addChars(start, chars);
      self.note.cleanUpTree();
      self.updateHtml();
      self.parseAtCaret(e);

      self.typing = false;
    });
  },

  onFocus: function (e) {
    this.enableEdit();
  },

  onBlur: function (e) {
    this.disableEdit();
  },

  parseAtCaret: function (e) {
    var $textarea = $(e.target);
    var text = $textarea.val();
    var start = $textarea[0].selectionStart;
    var end = $textarea[0].selectionEnd;
    var li = text.regexLastIndexOf(/\s/, start-1);
    var ri = text.regexIndexOf(/\s/, end);
    ri = ri === -1 ? start : ri;
    var word = text.substring(li+1, ri);
    this.parseCurrentWord(word);
  },

  parseCurrentWord: function (word) {
    var symbol = word.substr(0, 1);
    word = word.substr(1);
    if (word.length >= this.searchLength && symbol in this.endPoints) {
      this.filtered = this.endPoints[symbol].fetch({ data: { query: word }});
      console.log(this.filtered);
    }
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



