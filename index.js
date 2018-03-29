var os = require('os');
var fs = require('fs');
var crypto = require('crypto');
var util = require('util');
var path = require('path');
var childProcess = require('child_process');
var Entities = require('html-entities').XmlEntities;
var marked = require('marked');
var cheerio = require('cheerio');
var mkdirs = require('node-mkdirs');

var PLANTUML_JAR = path.join(__dirname, 'vendor/plantuml.jar');

var entities = new Entities();

function hashedImageName(content) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(content);

  return md5sum.digest('hex')
}

function parseUmlText(sourceText) {
  //var umlText = entities.decode(sourceText).replace(/(^[ \t]*\n)/gm, '');
  //umlText = marked(umlText).replace(/^<p>/, '').replace(/<\/p>\n$/, '');
  //umlText = entities.decode(umlText);

  //return umlText;
  return sourceText
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
            var imgSrc = buildImageFromPlantUml(gitbook, content, resolvedPath);

            $(this).attr('src', imgSrc);

        });
    return $.html();
}


function buildImageFromPlantUml(gitbook, umlText, optionalSourcePath) {
    var defaultFormat = gitbook.generator == 'ebook' ? '.png' : '.svg';
    var outputFormat = gitbook.generator == 'ebook' ? '-tpng' : '-tsvg';

    var re = /@startditaa/

    if (re.test(umlText)) {
        defaultFormat = '.png';
    }

    var imageName = hashedImageName(umlText) + defaultFormat;
    var tmpdir = process.env.PLANTUML_TEMPDIR || 
                gitbook.config.get('pluginsConfig.plantuml.tmpdir') ||
                os.tmpdir();
    gitbook.log.info("using tempDir ", tmpdir);
    mkdirs(tmpdir);
    var imagePath = path.resolve(path.join(tmpdir, imageName));

    if (fs.existsSync(imagePath) && false) {
        gitbook.log.info.ln("skipping plantUML image for ", imageName, " because ", imagePath, " already exists");
    }
    else
    {
        var cwd = process.cwd();
        if (optionalSourcePath) {
          cwd = path.dirname(optionalSourcePath);
        } else {
            var root = gitbook.config.get('root') || ""
            // TODO: better API to obtain that path? (ctx.ctx??)
            cwd = path.dirname(path.resolve(root, gitbook.ctx.ctx.file.path))
        }

        gitbook.log.info.ln("rendering plantUML image to ", imagePath);
        gitbook.log.info.ln("Working directory", cwd);
       
        var result = childProcess.spawnSync("java", [
        //     '-Dplantuml.include.path=' + cwd,
            '-Djava.awt.headless=true',
            '-jar', PLANTUML_JAR, outputFormat,
            '-charset', 'UTF-8',
            '-pipe'
        ],
        {
            // TODO: Extract stdout to a var and persist with gitbook.output.writeFile
            stdio: ['pipe', fs.openSync(imagePath, 'w'), 'pipe'],
            input: umlText,
            cwd: cwd
        });

        if (result.status != 0)
            gitbook.log.error.ln("Rendering failed for some reason, plantUML exit code =", status);
            
        // if (result.stdout)
        //     console.log(result.stdout.toString())
        // if (result.stderr)
        //     console.log(result.stderr.toString())
    }

    var targetPath = path.join("images/puml/", imageName);
    gitbook.log.debug.ln("copying plantUML from tempDir for ", imageName, " to ", targetPath);
    gitbook.output.copyFile(imagePath, targetPath);

    return path.join("/", targetPath);
}

module.exports = {
    blocks: {
        plantuml: {
            process: function (block) {
                var imgSrc = buildImageFromPlantUml(this, block.body);
                return { body: "<img src=\"" + imgSrc + "\"/>" };
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
