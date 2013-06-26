var hypertest = require('..')
  , Doc = require('../doc')
  , fs = require('fs');

function exec(root) {

  hypertest()
    .root(root)
    .concurrency(5)
    .end(function(resources) {
      report(resources);
    });

  function report(resources) {

    var links = []
      , nodes = {};

    Object.keys(resources).forEach(function(href) {
      var res = resources[href];

      if (!res) return;

      nodes[href] = {
        time: res.time,
        size: parseInt(res.headers['content-length']),
        path: href.replace(root, '')
      };

      var doc = new Doc(href, res.body);

      doc.on('link', function(link, rel) {
        links.push({
          source: href,
          target: link,
          rel: rel
        })
      });

      doc.parse();
    });

    fs.writeFileSync('report.json', JSON.stringify({
      root: root,
      nodes: nodes,
      links: links
    }));
  };

};

exec(process.argv[2]);
