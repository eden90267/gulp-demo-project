var gulp = require('gulp');
var $ = require('gulp-load-plugins')(); // 只針對gulp-*套件才有用
var autoprefixer = require('autoprefixer'); // for postCSS的延伸套件
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync').create();
var minimist = require('minimist');
var gulpSequence = require('gulp-sequence');

var envOptions = {
  string: 'env',
  default: {
    env: 'develop'
  }
};
var options = minimist(process.argv.slice(2), envOptions);
console.log(options);

gulp.task('clean', function () {
  return gulp.src(['./.tmp', './public', './.public'], {read: false})
    .pipe($.clean());
});

gulp.task('copyHTML', function () {
  return gulp.src('./source/**/*.html')
    .pipe(gulp.dest('./public/'))
});

gulp.task('pug', function () {
  gulp.src('./source/**/*.pug')
    .pipe($.plumber())
    .pipe($.data(function (file) {
      var khData = require('./source/data/data.json');
      var menu = require('./source/data/menu.json');

      var source = {
        'khData': khData,
        'menu': menu
      };
      console.log('pug', source);
      return source;
    }))
    .pipe($.pug({
      pretty: true
    }))
    .pipe(gulp.dest('./public/'))
    .pipe(browserSync.stream());
});

gulp.task('sass', function () {
  var plugins = [
    autoprefixer({browsers: ['last 3 version', '> 5%', 'ie 8']})
  ];
  return gulp.src('./source/scss/**/*.scss')
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass().on('error', $.sass.logError))
    // 編譯完成 CSS
    .pipe($.postcss(plugins))
    .pipe($.if(options.env === 'production', $.minifyCss()))
    .pipe($.sourcemaps.write('.')) // 輸出之前，把sourcemap寫入
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.stream());
});

gulp.task('babel', function () {
    return gulp.src('./source/js/**/*.js')
      .pipe($.sourcemaps.init())
      .pipe($.babel({
        presets: ['env']
      }))
      .pipe($.concat('all.js'))
      .pipe($.if(options.env === 'production', $.uglify({
        compress: {
          drop_console: true
        }
      })))
      .pipe($.sourcemaps.write('.'))
      .pipe(gulp.dest('./public/js'))
      .pipe(browserSync.stream());
  }
);

gulp.task('bower', function () {
  return gulp.src(mainBowerFiles())
    .pipe(gulp.dest('./.tmp/vendors'))
});

gulp.task('vendorJs', ['bower'], function () { // 優先執行bower的排程
  return gulp.src('./.tmp/vendors/**/*.js')
    .pipe($.order([
      'jquery.js',
      'tether.js',
      'bootstrap.js'
    ]))
    .pipe($.concat('venders.js'))
    .pipe($.if(options.env === 'production', $.uglify()))
    .pipe(gulp.dest('./public/js'));
});

gulp.task('browser-sync', function () {
  browserSync.init({
    server: {
      baseDir: "./public"
    }
  });
});

gulp.task('image-min', () =>
  gulp.src('./source/images/*')
    .pipe($.if(options.env === 'production', $.imagemin()))
    .pipe(gulp.dest('./public/images'))
);

gulp.task('deploy', function () {
  return gulp.src('./public/**/*')
    .pipe($.ghPages());
});

gulp.task('watch', function () {
  gulp.watch('./source/scss/**/*.scss', ['sass']);
  gulp.watch('./source/**/*.pug', ['pug']);
  gulp.watch('./source/**/*.js', ['babel']);
});

gulp.task('build', gulpSequence('clean', 'pug', 'sass', 'babel', 'vendorJs', 'image-min'));

gulp.task('default', ['pug', 'sass', 'babel', 'vendorJs', 'image-min', 'browser-sync', 'watch']);
