'use strict';

angular.module('qldarchApp').config(function($stateProvider) {
  $stateProvider.state('structures.australian', {
    url : '?index',
    templateUrl : 'views/structures.html',
    controller : 'StructuresCtrl',
    resolve : {
      structures : [ 'AggArchObjs', '$filter', function(AggArchObjs, $filter) {
        return AggArchObjs.loadProjects().then(function(data) {
          console.log('Total projects loaded aus:', data.length);
          var australianStructures = $filter('filter')(data, function(structure) {
            if (structure.australian === true) {
              return structure;
            }
          });
          console.log('Australian structures:', australianStructures.length);
          return australianStructures;
        }).catch(function() {
          //console.log('unable to load australian projects');
          return {};
        });
      } ]
    }
  });
});