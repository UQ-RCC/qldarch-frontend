'use strict';

angular.module('qldarchApp').controller('StructureCtrl', function($scope, structure, types, designers, Entity, $state, Uris) {
  $scope.structure = structure;
  if (typeof $scope.structure.uri === 'undefined') {
    $scope.structure[Uris.QA_AUSTRALIAN] = true;
  }
  var originalStructure = angular.copy(structure);
  $scope.designers = designers;
  console.log('structure', structure);

  function goToTypePage(typeUri) {
    if (typeUri === Uris.QA_ARCHITECT_TYPE) {
      $state.go('architect.summary', {
        architectId : structure.encodedUri
      });
    } else if (typeUri === Uris.QA_FIRM_TYPE) {
      $state.go('firm.summary', {
        firmId : structure.encodedUri
      });
    } else if (typeUri === Uris.QA_STRUCTURE_TYPE) {
      $state.go('structure.summary', {
        structureId : structure.encodedUri
      });
    } else {
      $state.go('other.summary', {
        otherId : structure.encodedUri
      });
    }
  }

  $scope.clearCompletionDate = function() {
    // delete structure[Uris.QA_COMPLETION_DATE];
    structure[Uris.QA_COMPLETION_DATE] = '';
  };

  $scope.updateStructure = function(structure) {
    if (structure.uri) {
      // PUT
      Entity.update(structure.uri, structure).then(function() {
        // Set the location stuff again
        if (angular.isDefined(structure[Uris.QA_LOCATION])) {
          structure.locations = [ structure[Uris.QA_LOCATION] ];
        }
      }, function(reason) {
        alert('Failed to save');
        console.log('Failed to save', reason);
        $state.go('structure.summary.edit', {
          structureId : structure.encodedUri
        });
      });

      goToTypePage($scope.structure[Uris.RDF_TYPE]);
    } else {
      // POST
      Entity.create(structure, Uris.QA_STRUCTURE_TYPE).then(function(structure) {
        console.log('structure', structure);
        goToTypePage($scope.structure[Uris.RDF_TYPE]);
      });
    }
  };

  $scope.cancel = function() {
    if (structure.uri) {
      angular.copy(originalStructure, structure);
      $state.go('structure.summary');
    } else {
      $state.go('structures.australian');
    }
  };

  /**
   * ======================================================
   * 
   * Select Box for Firms
   * 
   * ======================================================
   */
  // Setup the entity select boxes
  $scope.$watch('structure.$associatedFirm', function(associatedFirm) {
    if (associatedFirm) {
      structure[Uris.QA_ASSOCIATED_FIRM] = associatedFirm.uri;
    } else {
      delete structure[Uris.QA_ASSOCIATED_FIRM];
    }
  });
  $scope.firmSelect = {
    placeholder : 'Select a Firm',
    dropdownAutoWidth : true,
    multiple : false,
    allowClear : true,
    query : function(options) {
      Entity.loadAll('qldarch:Firm', true).then(function(firms) {
        var data = {
          results : []
        };

        angular.forEach(firms, function(firm) {
          if (firm.name.toLowerCase().indexOf(options.term.toLowerCase()) !== -1) {
            data.results.push(firm);
          }
        });
        options.callback(data);
      });
    }
  };

  /**
   * ======================================================
   * 
   * Select Box for Architects
   * 
   * ======================================================
   */
  // Setup the entity select boxes
  $scope.$watch('structure.$associatedArchitects', function(associatedArchitects) {
    if (associatedArchitects) {
      if (associatedArchitects.length) {
        structure[Uris.QA_ASSOCIATED_ARCHITECT] = [];
        angular.forEach(associatedArchitects, function(associatedArchitect) {
          structure[Uris.QA_ASSOCIATED_ARCHITECT].push(associatedArchitect.uri);
        });
      } else {
        delete structure[Uris.QA_ASSOCIATED_ARCHITECT];
      }
    }
  });

  $scope.architectSelect = {
    placeholder : 'Select an Architect',
    dropdownAutoWidth : true,
    multiple : true,
    query : function(options) {
      Entity.loadAll('qldarch:Architect', true).then(function(architects) {
        var data = {
          results : []
        };

        angular.forEach(architects, function(architect) {
          if (architect.name.toLowerCase().indexOf(options.term.toLowerCase()) !== -1) {
            data.results.push(architect);
          }
        });
        options.callback(data);
      });
    }
  };

  /**
   * ======================================================
   * 
   * Select Box for Types
   * 
   * ======================================================
   */
  $scope.structure.$type = null;
  angular.forEach(types, function(type) {
    if (type.uri === Uris.QA_STRUCTURE_TYPE) {
      $scope.structure.$type = {
        id : type.uri,
        uri : type.uri,
        text : type[Uris.QA_LABEL],
        name : type[Uris.QA_LABEL],
        encodedUri : type.encodedUri,
      };
    }
  });
  $scope.$watch('structure.$type', function(type) {
    // Delete all typologies on the structure
    if (type) {
      $scope.structure[Uris.RDF_TYPE] = type.uri;
    }
  });
  $scope.typeSelect = {
    placeholder : 'Select a Type',
    dropdownAutoWidth : true,
    multiple : false,
    query : function(options) {
      var data = {
        results : []
      };
      angular.forEach(types, function(type) {
        if (type.uri !== Uris.QA_BUILDING_TYPOLOGY && type[Uris.QA_LABEL].toLowerCase().indexOf(options.term.toLowerCase()) !== -1) {
          data.results.push({
            id : type.uri,
            uri : type.uri,
            text : type[Uris.QA_LABEL],
            name : type[Uris.QA_LABEL],
            encodedUri : type.encodedUri,
          });
        }
      });
      options.callback(data);
    }
  };

  /**
   * ======================================================
   * 
   * Select Box for Typologies
   * 
   * ======================================================
   */
  // Setup the entity select boxes
  $scope.$watch('structure.$typologies', function(typologies) {
    // Delete all typologies on the structure
    if (typologies) {
      if (typologies.length) {
        structure[Uris.QA_BUILDING_TYPOLOGY_P] = [];
        angular.forEach(typologies, function(typology) {
          structure[Uris.QA_BUILDING_TYPOLOGY_P].push(typology.uri);
        });
      } else {
        delete structure[Uris.QA_BUILDING_TYPOLOGY_P];
      }
    }
  });
  $scope.$watch('structure[Uris.QA_LOCATION]', function(location) {
    if (location) {
      if (!structure[Uris.GEO_LAT] && !structure[Uris.GEO_LONG]) {
        clearTimeout($scope.typingTimer);
        $scope.typingTimer = setTimeout(function() {
          /* globals $:false */
          $.getJSON('https://maps.googleapis.com/maps/api/geocode/json?address=' + $scope.structure[Uris.QA_LOCATION], function(data) {
            if (data.results.length === 1) {
              if (!structure[Uris.GEO_LAT] && !structure[Uris.GEO_LONG]) {
                structure[Uris.GEO_LAT] = data.results[0].geometry.location.lat;
                structure[Uris.GEO_LONG] = data.results[0].geometry.location.lng;
                $('#LAT').val(data.results[0].geometry.location.lat);
                $('#LNG').val(data.results[0].geometry.location.lng);
              }
            }
          });
        }, 3000);
      }
    }
  });
  $scope.typologySelect = {
    placeholder : 'Select a Building Typology',
    dropdownAutoWidth : true,
    multiple : true,
    query : function(options) {
      Entity.loadAll('qldarch:BuildingTypology', true).then(function(typologies) {
        var data = {
          results : []
        };

        angular.forEach(typologies, function(typology) {
          data.results.push({
            id : typology.uri,
            uri : typology.uri,
            text : typology[Uris.QA_LABEL],
            name : typology[Uris.QA_LABEL],
            encodedUri : typology.encodedUri,
          });
        });
        options.callback(data);
      });
    }
  };

});