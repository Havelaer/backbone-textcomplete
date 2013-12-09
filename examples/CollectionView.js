Backbone.CollectionView = Backbone.View.extend({

  /**
   * @param options {object}
   *   collection: Backbone.Collection  The collection containing the models.
   *   View:       Backbone.View        The view per model.
   *   model:      string               Name of the model parameter for the View.
   *   options:    object               Additional options for the View.
   */
  initialize: function (options) {
    this.subviews = {};
    this.collection = options.collection || console.warn('Property "collection" {Backbone.Collection} is required');
    this.createView = options.createView || console.warn('Property "createView" {Function} is required');
    this.renderView = options.renderView || this.renderView;
    this.removeView = options.removeView || this.removeView;

    this.listenTo(this.collection, 'reset', this.render);
    this.listenTo(this.collection, 'add', this._modelAdded);
    this.listenTo(this.collection, 'remove', this._modelRemoved);
  },

  render: function () {
    var subviews = {};
    var $div = $('<div />');
    this.collection.each(function (model) {
      var subview = this.subviews[model.cid] || false;
      if (subview) {
        delete this.subviews[model.cid];
        subview.delegateEvents();
      } else {
        subview = this.createView(model);
        this.listenTo(subview, 'all', this.proxyEvent);
      }
      subviews[model.cid] = subview;
      $div.append(subviews[model.cid].render().el);
    }, this);
    this.$el.empty();
    _(this.subviews).each(function (subview) {
      subview.remove();
      this.stopListening(subview);
    }, this);
    this.subviews = subviews;
    this.$el.append($div.contents());
    return this;
  },

  /**
   * Get the subview associated with the given model.
   */
  get: function (model) {
    return this.subviews[model.cid];
  },

  /**
   * Walk through all subviews
   */
  each: function (callback, context) {
    return _(this.subviews).each(callback, context);
  },

  /**
   * Remove the collectionView and detach the bindings.
   */
  remove: function () {
    Backbone.View.prototype.remove.apply(this, arguments);

    // Cleanup subview (bindings, the element is already removed from the dom)
    this.each(function (subview) {
      subview.remove();
    }, this);
  },

  /**
   * Remove a view from the DOM.
   * Overwrite to add effects.
   * @param {Backbone.View} view
   */
  removeView: function (view) {
    view.remove();
  },

  /**
   * Render the view. (view is not yet added to the DOM)
   * Overwrite to add effects.
   * @param {Backbone.View} view
   */
  renderView: function (view) {
    view.render();
  },

  _modelAdded: function (model) {
    if (this.subviews[model.cid]) { // Is the model already added as subview? probably via direct call to Collection.render()
      return;
    }
    var subview = this.createView(model);
    this.listenTo(subview, 'all', this.proxyEvent);

    this.subviews[model.cid] = subview;
    this.renderView(subview);

    if (this.collection.comparator) { // a sorted collection
      var position = null;
      this.collection.find(function (match, index) {
        if (model === match) {
          position = index;
          return true;
        }
        return false;
      });
      if (position === 0) { // first?
        this.$el.prepend(subview.el);
      } else if (position === this.el.children.length - 1) { // last?
        this.$el.append(subview.el);
      } else {
        $(this.el.children[position - 1]).after(subview.el); // in the middle
      }
    } else {
      // last item?
      this.$el.append(subview.el);
    }
  },

  _modelRemoved: function (model) {
    var subview = this.subviews[model.cid];
    this.removeView(subview);
    delete this.subviews[model.cid];
  },

  proxyEvent: function () {
    this.trigger.apply(this, arguments);
  }
});