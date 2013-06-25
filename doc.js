/**
 * Module dependencies
 */
var debug = require('simple-debug')('hypertest:doc')
  , Emitter = require('emitter');


module.exports = Doc;

function Doc(url, body) {
  this.url = url;
  this.body = body;
};

Emitter(Doc.prototype);

Doc.prototype.parse = function() {
  var self = this;
  searchElements(this.url, this.body, [], this);
};

function searchElements(url, body, path, doc) {
  Object.keys(body).forEach(function(key) {
    debug('checking for element',url+'#'+path.join('.')+'.'+key);
    var value = body[key]
      , link = value.href
      , action = value.action;

    // Tell 'em we have an element
    if (link) return doc.emit('link', link, key);
    if (action) return doc.emit('form', action, (value['method'] || 'GET').toUpperCase(), value.input, key);

    if (Array.isArray(value) || typeof value === 'object') searchElements(url, value, path.concat([key]), doc);
  });
};
