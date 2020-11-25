'use strict';

angular.module('qldarchApp').config(function($stateProvider) {
  $stateProvider.state('architect.interview', {
    url : '/interview/:interviewId?time',
    templateUrl : 'views/architect/interview.html',
    controller : 'InterviewCtrl',
    resolve : {
      relationships : [ 'architect', function(architect) {
        return architect.relationships;
      } ],
      interview : [ '$stateParams', 'ArchObj', function($stateParams, ArchObj) {
        return ArchObj.loadInterviewObj($stateParams.interviewId).then(function(data) {
          return data;
        }).catch(function() {
          //console.log('unable to load interview ArchObj with relationship labels');
          return {};
        });
      } ],
      relationshipOptions : [ 'Auth', 'RelationshipOptions', function(Auth, RelationshipOptions) {
        return Auth.status().then(function(){
          return RelationshipOptions.all();
        });
      } ]
    }
  });
});