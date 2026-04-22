'use strict';

angular.module('qldarchApp').config(function($stateProvider) {
  $stateProvider.state('structures.other', {
    url : '/other?index',
    templateUrl : 'views/structures.html',
    controller : 'StructuresCtrl',
    resolve : {
      structures : [ 'AggArchObjs', '$filter', function(AggArchObjs, $filter) {
        return AggArchObjs.loadProjects().then(function(data) {
          console.log('Total projects other loaded:', data.length);
          var otherStructures = $filter('filter')(data, function(structure) {
            if (structure.australian === false) {
              return structure;
            }
          });
          console.log('Other structures:', otherStructures.length);
          return otherStructures;
        }).catch(function() {
          //console.log('unable to load other projects');
          return {};
        });
      } ]
    }
  });
});
          