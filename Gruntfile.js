module.exports = function(grunt) {
  grunt.initConfig({
    //our JSHint options
    jshint: {
      all: ['lib/iq.js', 'lib/messages.js', 'lib/conveyor.js'] //files to lint
    },
    //our concat options
    concat: {
      options: {
        separator: ';' //separates scripts
      },
      dist: {
        src: ['lib/*.js'], //Using mini match for your scripts to concatenate
        dest: 'lib/iqnode.js' //where to output the script
      }
    },
    //our uglify options
    uglify: {
      js: {
        files: {
        'lib/iqnode.js': ['lib/iqnode.js'] //save over the newly created script
        }
      }
    },
    vows: {
      all : {
        src : ['test/*.js'],
        options : {
          reporter : "spec"
        }
      }
    }
  });
  //load our tasks
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-vows-runner');
  //default tasks to run
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
  grunt.registerTask('test', ['default', 'vows']);
}
