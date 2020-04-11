module.exports = (grunt) => {
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // lint:{
    //   files:['grunt.js', 'lib/**/*.js', 'test/**/*.js', 'spec/**/*_test.js']
    // },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true,
        mocha: true,
      },
      globals: {
        exports: true,
      },
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
        },
        src: ['test/*.js'],
      },
    },
  });

  grunt.registerTask('default', 'mochaTest');
  grunt.registerTask('test', 'mochaTest');
};
