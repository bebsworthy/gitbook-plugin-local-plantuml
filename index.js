var os = require('os');
var fs = require('fs');
var crypto = require('crypto');
var util = require('util');
var path = require('path');
var childProcess = require('child_process');
var Entities = require('html-entities').XmlEntities;
var marked = require('marked');
var cheerio = require('cheerio');

var PLANTUML_JAR = path.join(__dirname, 'vendor/plantuml.jar');

var entities = new Entities();

function hashedImageName(content) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(content);

  return md5sum.digest('hex')
}

function parseUmlText(sourceText) {
  var umlText = entities.decode(sourceText).replace(/(^[ \t]*\n)/gm, '');
  umlText = marked(umlText).replace(/^<p>/, '').replace(/<\/p>\n$/, '');
  umlText = entities.decode(umlText);

  return umlText;
}

function processPumlImg(gitbook, page) {
    var $ = cheerio.load(page.content);
    // get all images from section content
    var pagePath = page.path;
    pagePath = pagePath.substring(0, pagePath.lastIndexOf("/"));

    $('img')
        .filter(function () {
            return $(this).attr('src').endsWith('.puml');
        })
        .each(function (i) {
            var src = $(this).attr('src');
            if (pagePath)  {
                src = pagePath + '/' + src;
            }
            var resolvedPath = gitbook.book.resolve(src);
            gitbook.log.debug("processing plantUML from ", resolvedPath);
            gitbook.log.debug("i ", i);
            gitbook.log.debug("this ", $(this));

            var content = fs.readFileSync(resolvedPath, 'utf8');
            var imgSrc = buildImageFromPlantUml(gitbook,content);

            $(this).attr('src', imgSrc);

        });
    return $.html();
}


function buildImageFromPlantUml(gitbook, umlText) {
    var defaultFormat = gitbook.generator == 'ebook' ? '.png' : '.svg';
    var outputFormat = gitbook.generator == 'ebook' ? '-tpng' : '-tsvg';

    var re = /@startditaa/

    if (re.test(umlText)) {
        defaultFormat = '.png';
    }

    var imageName = hashedImageName(umlText) + defaultFormat;
    gitbook.log.debug("using tempDir ", os.tmpdir());
    var imagePath = path.join(os.tmpdir(), imageName);

    if (fs.existsSync(imagePath)) {
        gitbook.log.info("skipping plantUML image for ", imageName);
    }
    else {
        gitbook.log.info("rendering plantUML image to ", imageName);

        var cwd = cwd || process.cwd();

        childProcess.spawnSync("java", [
                '-Dplantuml.include.path=' + cwd,
                '-Djava.awt.headless=true',
                '-jar', PLANTUML_JAR, outputFormat,
                '-pipe'
            ],
            {
                // TODO: Extract stdout to a var and persist with gitbook.output.writeFile
                stdio: ['pipe', fs.openSync(imagePath, 'w'), 'pipe'],
                input: umlText
            });
    }

    gitbook.log.debug("copying plantUML from tempDir for ", imageName);
    gitbook.output.copyFile(imagePath, imageName);

    return path.join("/", imageName);
}

module.exports = {
    blocks: {
        plantuml: {
            process: function (block) {

                var umlText = parseUmlText(block.body);
                var imgSrc = buildImageFromPlantUml(this, umlText);

                return "<img src=\"" + imgSrc + "\"/>";
            }
    }
  },
  hooks: {
      page: function(page) {
          page.content = processPumlImg(this, page);
          return page;
      }
  }
};
