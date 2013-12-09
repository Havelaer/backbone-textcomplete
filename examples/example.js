
// Users Collection

var Users = Backbone.Collection.extend({

  model: Backbone.Model.extend({
    defaults: { type: 'user' },
    title: function () {
      return this.get('firstname') + ' ' + this.get('name');
    }
  }),

  fetch: function (options) {
    var q = options.data.query;
    var pattern = new RegExp('^' + q);
    return this.filter(function (item) {
      return pattern.test(item.get('firstname')) || pattern.test(item.get('name'));
    });
  }

});

// Dossiers Collection

var Dossiers = Backbone.Collection.extend({

  model: Backbone.Model.extend({
    defaults: { type: 'dossier' },
    title: function () {
      return this.get('name');
    }
  }),

  fetch: function (options) {
    var q = options.data.query;
    var pattern = new RegExp('^' + q);
    return this.filter(function (item) {
      return pattern.test(item.get('name'));
    });
  }

});

// example users

var users = new Users([
  { id: 1, firstname: 'clark', name: 'kent' },
  { id: 2, firstname: 'bruce', name: 'lee' },
  { id: 3, firstname: 'bruce', name: 'willis' },
  { id: 4, firstname: 'bruce', name: 'wayne' }
]);

// example dossiers

var dossiers = new Dossiers([
  { id: 1, name: 'hero' },
  { id: 2, name: 'actor' },
  { id: 2, name: 'douche' }
]);

// example note

var prefilled = [
  { type: "text", text: "Hey " },
  { type: "user", text: "max", value: 12 },
  { type: "text", text: ", could you fix that bug " },
  { type: "date", text: "tomorrow", value: "2013-11-30" },
  { type: "text", text: " before " },
  { type: "time", text: "3pm", value: "15:00" },
  { type: "text", text: "?"}
];

var note = new Note(prefilled);

// note View

var suggestions = new Backbone.Collection();

var noteView = new NoteView({

  // note: note,

  searchLength: 3,

  suggestions: suggestions,

  endPoints: {
    '@': users,
    '#': dossiers
  }
});

noteView.setElement($('.note')).render();

// suggestion list

var ItemView = Backbone.View.extend({

  tagName: 'li',

  initialize: function (options) {
    this.model = options.model;
  },

  render: function () {
    console.log(this.model.toJSON());
    this.$el.attr('data-type', this.model.get('type'));
    this.$el.attr('data-value', this.model.id);
    this.$el.text(this.model.title());
    return this;
  }

});

var suggestionView = new Backbone.CollectionView({
  collection: suggestions,
  createView: function (model) {
    return (new ItemView({
      model: model
    })).render();
  }
});

suggestionView.setElement($('.suggestions')).render();