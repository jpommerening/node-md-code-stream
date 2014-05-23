#!/usr/bin/env node

var stream = require('stream');
var fs = require('fs');
var path = require('path');
var inherits = require('util').inherits;
var marked = require('marked');

function slug(text) {
  return text.toLowerCase().match(/\w+/g).join('-');
}

function CodeBlock(code, props) {
  if (!(this instanceof CodeBlock)) {
    return new CodeBlock(code, props);
  }

  stream.Readable.call(this, {});

  this.section = props.section;
  this.num = props.num;
  this.language = props.language;
  this.props = {
    path: props.path,
    basename: path.basename(props.path),
    dirname: path.dirname(props.dirname)
  };

  this._data = code;
}
inherits(CodeBlock, stream.Readable);

CodeBlock.prototype._read = function (size) {
  var data = this._data.substr(0, size);
  this._data = this._data.substr(size);

  if (data) {
    this.push(data);
  }
  if (!this._data) {
    this.push(null);
  }
};

function MarkdownCodeBlocks(options) {
  if (!(this instanceof MarkdownCodeBlocks)) {
    return new MarkdownCodeBlocks(options);
  }

  stream.Transform.call(this, options);

  var renderer = new marked.Renderer();
  var section = [];
  var num = 0;
  var self = this;

  renderer.heading = function (text, level) {
    section = section.slice(0, level-1);
    section.push(text);
    num = 0;
  };
  renderer.code = function (code, language) {
    self._entry(section, num++, code, language);
  };

  this._data = '';
  this._renderer = renderer;
}
inherits(MarkdownCodeBlocks, stream.Transform);

MarkdownCodeBlocks.prototype._slug = function (section, num, language) {
  return section.map(slug).join('/') + (num ? '-' + num : '') + (language ? '.' + language : '');
};

MarkdownCodeBlocks.prototype._entry = function (section, num, code, language) {
  var self = this;
  var name = this._slug(section, num, language);
  var entry = new CodeBlock(code, {
    path: name,
    language: language,
    section: section.slice(),
    num: num
  });

  entry.on('end', function () {
    self.emit('childEnd', entry);
    self.emit('entryEnd', entry);
  });
  this.emit('child', entry);
  this.emit('entry', entry);
};

MarkdownCodeBlocks.prototype._transform = function (chunk, encoding, callback) {
  this._data += chunk.toString(encoding === 'buffer' ? null : encoding);
  this.push(chunk, encoding);
  callback();
};

MarkdownCodeBlocks.prototype._flush = function (callback) {
  this.push(null);

  marked(this._data, {renderer: this._renderer}, callback);
};

MarkdownCodeBlocks.prototype.pipe = function (dest, options) {
  if (typeof dest.add === 'function') {
    this.on('entry', dest.add.bind(dest));
  }

  return stream.Transform.prototype.pipe.apply(this, arguments);
};

function mdCodeStream(options) {
  return new MarkdownCodeBlocks(options);
}

mdCodeStream.CodeBlock = CodeBlock;
mdCodeStream.MarkdownCodeBlocks = MarkdownCodeBlocks;

module.exports = mdCodeStream;

if (process.argv.length > 1) {
  function pipeCodeBlocks(stream) {
    stream.pipe(mdCodeStream()).on('entry', function (entry) {
      process.stderr.write(entry.props.path + '\n');
      entry.pipe(process.stdout);
    });
  }

  fs.realpath(process.argv[1], function(err, file) {
    if (err) {
      return;
    }
    if (file === __filename) {
      if (process.argv.length > 2) {
        process.argv.slice(2)
                    .map(fs.createReadStream)
                    .map(pipeCodeBlocks);
      } else {
        pipeCodeBlocks(process.stdin);
      }
    }
  });
}
