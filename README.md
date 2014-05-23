# md-code-stream

> Extract code blocks from Markdown streams, so you can test them

## Examples

In this example, we parse *this* `README.md` file and extract the first code
block:

```js
var fs = require('fs');
var assert = require('assert');

var mdCodeStream = require('md-code-stream');

var readme = fs.createReadStream('README.md')
               .pipe(mdCodeStream());

readme.once('entry', function(entry) {
  assert(entry.section[0] === 'md-code-stream');
  assert(entry.section[1] === 'Examples');
  assert(entry.num === 0);
  assert(entry.language === 'js');
  assert(entry.props.path === 'md-code-stream/examples.js');

  // At this point we could also pipe it to stdout:
  // entry.pipe(process.stdout);
});
```

The stream is compatible with [`fstream`](https://npmjs.org/package/fstream),
so you can pipe it to a directory.

```js
var fs = require('fs');
var fstream = require('fstream');
var assert = require('assert');

var mdCodeStream = require('md-code-stream');

fs.createReadStream('README.md')
  .pipe(mdCodeStream())
  .pipe(fstream.Writer({path: 'tmp', type: 'Directory'}))
  .on('close', function() {
    assert(fs.existsSync('tmp/md-code-stream/examples.js'));
    assert(fs.existsSync('tmp/md-code-stream/examples-1.js'));
  });
```
