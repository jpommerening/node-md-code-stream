var fs = require('fs');
var fstream = require('fstream');
var assert = require('assert');
var mdCodeStream = require('./index');

var readme = mdCodeStream();
var writer = fstream.Writer({path: 'tmp', type: 'Directory'});
var entries = [];

readme.on('entry', function (entry) {
  entries.push('./tmp/' + entry.props.path);
});

readme.pipe(writer).on('close', function() {

  entries.forEach(function (path) {

    console.log('Testing ' + path);
    console.log();

    // test that the file was created
    assert.ok(fs.existsSync(path));

    // test that we did not mess the README.md's code samples up
    assert.doesNotThrow(function() {
      require(path);
    });

  });

});

fs.createReadStream('README.md').pipe(readme);
