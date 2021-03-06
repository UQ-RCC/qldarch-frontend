'use strict';

angular.module('qldarchApp').config(function($stateProvider) {
  $stateProvider.state('user.files.interviews', {
    url : '/interviews',
    resolve : {
      mediainterviews : [ 'mediaowned', '$filter', function(mediaowned, $filter) {
        return $filter('filter')(mediaowned, function(med) {
          return (med.type === 'Audio' || med.type === 'Transcript' || med.type === 'Youtube');
        });
      } ]
    },
    controller : 'UserFilesInterviewsCtrl',
    templateUrl : 'views/user/user.files.interviews.html'
  });
});