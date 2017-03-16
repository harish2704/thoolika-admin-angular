/* jshint node:true */
'use strict';


var gulp = require('gulp');
var fs = require('fs');
var templateCache = require('gulp-angular-templatecache');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var minifyHTML = require('gulp-minify-html');

var jsOutDir = 'static/thoolika-admin-angular/js/';
var cssOutDir = 'static/thoolika-admin-angular/css/';

gulp.task('default', ['templateCache', 'minify', 'css' ]);

gulp.task( 'css', function(){
  return gulp.src('./css/thoolika.css')
    .pipe(gulp.dest( cssOutDir ));
});

gulp.task('templateCache', function () {
  return gulp.src('src/templates/**/*.html')
    .pipe(minifyHTML({
      quotes: true
    }))
    .pipe(templateCache({
      module: 'thoolika.admin'
    }))
    .pipe(gulp.dest( jsOutDir ));
});

gulp.task('minify', function () {
  var files = [
    'src/*.js'
  ];

  return gulp.src(files)
    .pipe(concat('main.js'))
    .pipe(gulp.dest( jsOutDir ))
    .pipe(uglify())
    .pipe(rename('main.min.js'))
    .pipe(gulp.dest( jsOutDir ));

});

