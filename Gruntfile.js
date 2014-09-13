module.exports = function(grunt) {
  grunt.initConfig({
    //our JSHint options
    jshint: {
      all: 'lib/*.js' //files to lint
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
  grunt.loadNpmTasks('grunt-vows-runner');
  //default tasks to run
  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('test', ['jshint', 'vows']);
}
