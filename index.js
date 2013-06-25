/**
 * Module dependencies
 */
var debug = require('simple-debug')('hypertest')
  , superagent = require('superagent')
  , Emitter = require('emitter')
  , Queue = require('queue-component')
  , Doc = require('./doc');

module.exports = Hypertest;

function noop() {};

function Hypertest() {
  if (!(this instanceof Hypertest)) return new Hypertest();
  var self = this;
  self.resources = {};
  self.submissions = {};
  self.logRoutes = false;
  self.readOnly = true;
  self.on('resource', function(res, url) {
    self.handleResource(res, url);
  });
}
Emitter(Hypertest.prototype);

Hypertest.prototype.root = function(root) {
  this.root = root;
  return this;
};

Hypertest.prototype.log = function() {
  this.logRoutes = true;
  return this;
};

Hypertest.prototype.concurrency = function(value) {
  this._concurrency = value || 3;
  return this;
};

Hypertest.prototype.timeout = function(value) {
  this._timeout = value || 2000;
  return this;
};

Hypertest.prototype.end = function(fn) {
  var self = this;
  self.queue = new Queue({ concurrency: self._concurrency, timeout: self._timeout });

  self.follow(self.root);

  self.on('end', function() {
    fn(self.resources);
  });
};

Hypertest.prototype.handleResource = function(res, url) {
  var self = this;
  self.resources[url] = res;
  var doc = new Doc(url, res.body);

  doc.on('link', function(link, rel) {
    debug('queueing',link);
    self.follow(link);
  });

  doc.on('form', function(action, method, inputs, rel) {
    if (self.readOnly || self.submissions[action] && self.submissions[action][method]) return;
    debug('queueing',action);

    // TODO allow the consumer to set the form values here
    
    self.submit(action, method, inputs, done);
  });

  doc.parse();
  // TODO fix this
  // This is probably wrong
  if (self.queue.length() === 1) self.emit('end');
};

Hypertest.prototype.follow = function(url) {
  var self = this;
  if (self.resources[url]) return;
  // Lock it
  self.resources[url] = true;
  self.queue.push(function(done) {
    var start = Date.now();
    superagent
      .get(url)
      .on('error', done)
      .end(function(res) {
        res.time = Date.now() - start;
        if (self.logRoutes) console.log('GET', url.replace(self.root, ''), res.status, res.time+'ms');
        if (res.error) return done(new Error(res.text), res);
        done(null, res);
      });
  }, function(err, res) {
    self.resources[url] = res || {err: err};
    if (err) return self.emit('error', err, url, res);
    self.emit('resource', res, url);
  });
};

Hypertest.prototype.submit = function(action, method, inputs, done) {
  var self = this;
  if (!self.submissions[action]) self.submissions[action] = {};
  if (self.submissions[action][method]) return;

  // Lock it
  self.submissions[action][method] = true;

  self.queue.push(function(done) {
    var start = Date.now();

    var req = superagent(method, action)
      .on('error', done);

    if (method === 'GET' && inputs) req.query(inputs);
    else req.send(inputs);

    req
      .end(function(res) {
        res.time = Date.now() - start;
        if (self.logRoutes) console.log(method, action.replace(self.root, ''), res.status, res.time+'ms');
        if (res.error) return done(new Error(res.text), res);
        done(null, res);
      });
  }, function(err, res) {
    if (err) return self.emit('error', err, url, res);
    self.submissions[action][method] = res;
    // TODO what do we do with a form submission response?
    // self.emit('resource', res, url);
  });
};
