'use strict';

angular.module('qldarchApp').controller('FirmCtrl', function($scope, $filter, firm,toaster, firms, architects, ArchObj, $state, Utils) {
  $scope.firm = firm;
  $scope.filteredFirms = [];
  $scope.isDuplicate = false;
  $scope.exactMatch = null;
  

  $scope.architectSelect = {
    placeholder : 'Select an Architect',
    dropdownAutoWidth : true,
    multiple : true,
    data : Utils.makeSelectOptions(architects)
  };

  $scope.firm.type = 'firm';

  //drop down list for new firms to avoid duplications

 /*  $scope.filterFirms = function(input) {
  if (!input) {
    $scope.filteredFirms = [];
    return;
  }

  const term = input.trim().toLowerCase();

  $scope.filteredFirms = firms.filter(function(f) {
    return f.label && f.label.toLowerCase().includes(term);
  });
}; */

  $scope.filterFirms = function(input) {
      console.log('filterFirms input:', input);
      console.log('firms:', firms);

      if (!input) {
        $scope.filteredFirms = [];
        $scope.isDuplicate = false;
        $scope.exactMatch = null;
        return;
      }

      const term = input.trim().toLowerCase();

      let exactMatch = null;
      let contains = [];

      firms.forEach(function(f) {
        if (!f.label) return;

        const label = f.label.toLowerCase();

        console.log('checking:', f.label);

        //  exact duplicate
        if (label === term) {
          exactMatch = f;
        }
       
        // fallback relevance
        else if (label.includes(term)) {
          contains.push(f);
        }
      });

      // duplicate found
      if (exactMatch) {
        $scope.isDuplicate = true;
        $scope.exactMatch = exactMatch;
        $scope.filteredFirms = [exactMatch];
        return;
      }

      //  no duplicate
      $scope.isDuplicate = false;
      $scope.exactMatch = null;

      //  ranked results (limit for UI performance)
      $scope.filteredFirms = contains.slice(0, 10);
  };

  $scope.updateFirm = function(data) {
    if (data.id) {
      ArchObj.updateFirm(data).then(function() {
        $state.go('firm.summary', {
          firmId : data.id
        });
      }).catch(function(error) {
        //console.log('Failed to save', error);
        $state.go('firm.summary.edit', {
          firmId : data.id
        });
      });
    } else {
      
      if (!data.label || !data.label.trim()) {  
        return;
      }
      const newLabel = data.label.trim().toLowerCase();
      const duplicate = firms.find(function(f) {
        return f.label &&
              f.label.trim().toLowerCase() === newLabel;
      });
      if (duplicate) {
        //console.log('Firm already exists');
         toaster.pop('error', 'Error occured', "Duplicate firm label: '" + data.label + "'. Please choose a different name.");
        return;
      }
      ArchObj.createFirm(data).then(function() {
        $state.go('firm.summary', {
          firmId : data.id
        });
      }).catch(function(error) {
        //console.log('Failed to save', error);
        $state.go('firm.summary.edit', {
          firmId : data.id
        });
      });
    }
  };

  var dataFirmSelect = Utils.makeSelectOptions(firms);
  

  if (angular.isDefined(firm.precededby)) {
    $scope.firm.$precededByFirms = {
      id : firm.precededby.id,
      text : firm.precededby.label
    };
  } else {
    $scope.firm.$precededByFirms = null;
  }

  $scope.precededBySelect = {
    placeholder : 'Select a Firm',
    dropdownAutoWidth : true,
    multiple : false,
    data : dataFirmSelect
  };

  if (angular.isDefined(firm.succeededby)) {
    $scope.firm.$succeededByFirms = {
      id : firm.succeededby.id,
      text : firm.succeededby.label
    };
  } else {
    $scope.firm.$succeededByFirms = null;
  }

  $scope.succeededBySelect = {
    placeholder : 'Select a Firm',
    dropdownAutoWidth : true,
    multiple : false,
    data : dataFirmSelect
  };

  $scope.clearStartYear = function() {
    firm.start = '';
  };

  $scope.clearEndYear = function() {
    firm.end = '';
  };

  $scope.cancel = function() {
    if (firm.id) {
      $state.go('firm.summary');
    } else {
      $state.go('firms.australian');
    }
  };
});