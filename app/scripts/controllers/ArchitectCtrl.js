'use strict';

angular.module('qldarchApp').controller('ArchitectCtrl', function($scope, architect, interviews, $state, ArchObj, Utils, architects, toaster) {
  $scope.architect = architect;
  $scope.interviews = interviews;
  $scope.architect.type = 'person';
  $scope.filteredArchitects = [];
  $scope.exactMatch = null;
  $scope.isDuplicate = false;

  
  console.log('ArchitectCtrl architects', architects);


  $scope.filterArchitects = function() {

      const first = ($scope.architect.firstname || '').trim().toLowerCase();
      const last  = ($scope.architect.lastname || '').trim().toLowerCase();

      const term = (first + ' ' + last).trim();

      if (!term) {
        $scope.filteredArchitects = [];
        $scope.isDuplicate = false;
        return;
      }

      let exactMatch = null;
      let results = [];

      architects.forEach(function(a) {

        const full = ((a.firstname || '') + ' ' + (a.lastname || '')).trim().toLowerCase();

        if (full === term) {
          exactMatch = a;
        }

        if (full.includes(term)) {
          results.push(a);
        }
      });

      // duplicate detected
      if (exactMatch) {
        $scope.isDuplicate = true;
        $scope.exactMatch = exactMatch;
        $scope.filteredArchitects = [exactMatch];
        return;
      }

      $scope.isDuplicate = false;
      $scope.exactMatch = null;

      $scope.filteredArchitects = results.slice(0, 10);
  };
 
  $scope.updateArchitect = function(data) {
    if (data.id) {
      ArchObj.updateArchitect(data).then(function() {
        $state.go('architect.summary', {
          architectId : data.id
        });
      }).catch(function(error) {
        //console.log('Failed to save', error);
        $state.go('architect.summary.edit', {
          architectId : data.id
        });
      });
    } else {
      console.log('creating architect with label:', data);
      if (!data.firstname || !data.lastname) {  
        return;
      }
      const newLabel = (data.firstname + ' ' + data.lastname).trim().toLowerCase();
      const duplicate = architects.find(function(a) {
        return a.label &&
              a.label.trim().toLowerCase() === newLabel;
      });
      if (duplicate) {
        console.log('Architect already exists');
         toaster.pop('error', 'Error occured', "Duplicate architect label: '" + newLabel + "'. Please choose a different name.");
        return;
      }

      ArchObj.createArchitect(data).then(function(response) {
        $state.go('architect.summary', {
          architectId : response.id
        });
      }).catch(function(error) {
        //console.log('Failed to save', error);
        $state.go('architect.summary.edit', {
          architectId : data.id
        });
      });
    }
  };

  $scope.cancel = function() {
    if (architect.id) {
      $state.go('architect.summary');
    } else {
      $state.go('architects.queensland');
    }
  };
});