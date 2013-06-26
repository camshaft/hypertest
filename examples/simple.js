var hypertest = require('..');

function exec(root) {

  console.log('testing:', root);

  hypertest()
    .root(root)
    .log()
    .concurrency(5)
    .end(function(resources) {
      report(resources);
    });

  function report(resources) {
    var responseTimes = []
      , count = 0
      , statusCodes = {}
      , types = {}
      , sizes = []
      , errors = {};

    Object.keys(resources).forEach(function(href) {
      var res = resources[href];
      responseTimes.push(res.time);
      count++;
      if (!res || !res.status) {
        if (!errors[res.err.message]) errors[res.err.message] = [];
        return errors[res.err.message].push(href);
      }

      statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;
      if (res.headers) sizes.push(parseInt(res.headers['content-length']));
      if (res.type) types[res.type] = (types[res.type] || 0) + 1
    });

    var meanResTime = average(responseTimes)
      , meanSize = average(sizes);

    console.log()
    console.log('===== Report =====')
    console.log('# of resources:', count);
    console.log('Average response time:', meanResTime+'ms');
    console.log('Average size:', meanSize+' bytes');
    console.log('Status codes:', statusCodes);
    console.log('Content types:', types);
    console.log('Errors:', errors);
  };

};

function average(numbers) {
  return numbers.reduce(function(curr, prev) {
    if (!curr) return prev;
    return curr + prev;
  }) / numbers.length;
};

exec(process.argv[2]);
