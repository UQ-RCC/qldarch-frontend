'use strict';

angular.module('qldarchApp')
// interview, transcript, evidences
// FIXME: start pulling these out into services!
.controller('InterviewCtrl', function ($scope, interview, $state, $http, Uris, Entity, Ontology, types, 
    interviews, $stateParams, $location, $anchorScroll, $timeout, GraphHelper, Expression, $cacheFactory, $q) {
  // Setup

  $scope.delete = function (interview) {
    var interviewee = $scope.interview.$interviewees[0];
    Expression.delete(interview.uri, interview).then(function () {
      $cacheFactory.get('$http').remove('/ws/rest/expression/detail/qldarch%3AInterview?INCSUBCLASS=false&');
      $cacheFactory.get('$http').remove('/ws/rest/expression/summary/qldarch%3AInterview?INCSUBCLASS=false&');
      $state.go(interviewee.$state + '.summary', interviewee.$stateParams);
    });
  };

  $scope.sub = 'interviews';
  $scope.interviews = interviews;
  $scope.interview = interview;
  if (interview.transcript) {
    $scope.title = interview.transcript.date.toLowerCase();
    $scope.isShowingTranscript = true;
  } else {
    $scope.title = 'Unknown Date';
    $scope.isShowingTranscript = false;
  }

  $scope.isSyncingTranscript = false;
  var audioPlayerDom = document.getElementById('audio1');
  $scope.audioPlayer = {};


  // Look for our external locations
  $scope.audioPlayerPlaylist = [];
  console.log('external locations', GraphHelper.asArray(interview[Uris.QA_EXTERNAL_LOCATION]));
  angular.forEach(GraphHelper.asArray(interview[Uris.QA_EXTERNAL_LOCATION]), function (extLocation) {

    // Youtube URL
    if (extLocation.indexOf('you') !== -1) {
      $scope.youtubeUrl = extLocation;
      return;
    }

    var fileExtension = extLocation.substring(extLocation.length - 3);
    console.log('fileExtension', fileExtension);
    if (fileExtension === 'mp3') {
      // its an mp3 file
      $scope.audioPlayerPlaylist = [{
        src: extLocation,
        type: 'audio/mp3'
      }];
      $scope.download = {
          mp3: extLocation.substring(0, extLocation.length - 3) + 'mp3'
      };
    } else if (fileExtension === 'ogg') {
      // its an ogg file
      $scope.audioPlayerPlaylist.push({
        src: extLocation,
        type: 'audio/ogg'
      });
    }
  });
  console.log('playlist is', $scope.audioPlayerPlaylist);

  $scope.currentSpeaker = {};
  $scope.isSyncing = true;
  $scope.isSearching = false;

  function scrollToTime(time, duration) {
    console.log('scrolling to time!');
    if (!duration) {
      duration = 2000;
    }
    jQuery('html, body').animate({
      scrollTop: jQuery('#' + time).offset().top - 20
    }, duration);
  }

  $scope.$watch('isSyncing', function (isSyncing, isSyncingOld) {
    if (isSyncing === false && isSyncingOld === true) {
      // Its been turned off, check if there is a time and scroll
      if (angular.isDefined($scope.currentExchange)) {
        $timeout(function () {
          var startTime = $scope.currentExchange.startTime;
          scrollToTime(startTime, 1);
        }, 0);

      }
    }
  });

  // Amount of exchanges to display
  var exchangeDisplayCountDefault = 10;
  if ($stateParams.time) {
    $scope.startTime = $stateParams.time;
    angular.forEach(interview.transcript.exchanges, function (exchange, index) {
      if (exchange.startTime.toString() === $stateParams.time.toString()) {
        console.log('once');
        $scope.exchangeDisplayCount = index + 20;
      }
    });
    setTimeout(function () {
      scrollToTime($stateParams.time, 2000);
      console.log('there is a time', $stateParams.time);
    }, 0);
  } else {
    $scope.exchangeDisplayCount = exchangeDisplayCountDefault;
  }

  /**
   * Sets the current exchange based on the current time
   * 
   * @param currentTime
   */
  function setCurrentExchangeFromTime(currentTime) {
    var index;
    if (interview.transcript) {
      angular.forEach($scope.interview.transcript.exchanges, function (exchange, exchangeIndex) {
        if (currentTime < exchange.endTime && !angular.isDefined(index)) {
          index = exchangeIndex;
        }
      });
      if (index >= 0) {
        $scope.currentExchangeIndex = index;
        $scope.currentExchange = $scope.interview.transcript.exchanges[index];
        // change request #36, only show photos of the interviewees.
        // i think the currentSpeaker is used for the photo on the
        // interview page and for nothing else (Andre)
        if($scope.currentExchange.speaker && !$scope.currentExchange.speaker.isInterviewer) {
          $scope.currentSpeaker = $scope.currentExchange.speaker;
        } else {
          $scope.currentSpeaker = interview.interviewees[0];
        }
      }
    } else {
      $scope.currentSpeaker = interview.interviewees[0];
    }
  }

  /**
   * Cancels searching
   */
  function playing() {
    $scope.isSearching = false;
    $scope.transcriptSearchInput = '';
  }

  // Updates the current exchange from player
  $scope.$watch('audioPlayer.currentTime', setCurrentExchangeFromTime);
  // Cancels any searching when the play button is clicked
  $scope.$on('audioplayer:play', playing);

  $scope.relationshipSelectOptions = {
      placeholder: 'Relationship',
      dropdownAutoWidth: true,
      query: function (options) {
        console.log('querying', options);
        Ontology.findPropertyByName(options.term).then(function (properties) {
          var data = {
              results: []
          };
          angular.forEach(properties, function (property) {
            data.results.push({
              id: property.uri,
              uri: property.uri,
              text: property.name,
              name: property.name,
              encodedUri: property.encodedUri,
              entailsRelationship: property[Uris.QA_ENTAILS_RELATIONSHIP]
            });
          });
          data.results.sort(function(a,b) { return a.text.localeCompare(b.text);});
          options.callback(data);
        });
      }
  };

  function wrapForResults(results) {
    return {
      results: results
    };
  }

  function convertEntitiesToDropdownResults(entities) {
    // sort by name
    entities = _.sortBy(entities, function(entity) {
      return entity.name.length;
    }).slice(0, 5);

    var results =_.map(entities, function (entity) {
      return {
        id: entity.uri,
        uri: entity.uri,
        text: entity.name,
        type: entity.type,
        name: entity.name,
        encodedUri: entity.encodedUri
      };
    });
    return wrapForResults(results);
  }

  // Setup the select boxes
  function getEntitiesByName(name) {
    if(!name.length) {
      return $q.when(wrapForResults([]));
    }
    return Entity.findByName(name, false).then(convertEntitiesToDropdownResults);
  }

  /* globals _:false */
  function debouncedGetEntitiesByName(name, callback) {
    (_.debounce(function(name, callback) {
      // only run this every second
      getEntitiesByName(name).then(function(data) {
        callback(data);
      });
    }, 750))(name, callback);
  }

  $scope.subjectSelectOptions = {
      placeholder: 'Subject',
      dropdownAutoWidth: true,
      query: function (options) {
        debouncedGetEntitiesByName(options.term, options.callback);
      }
  };
  
  $scope.objectSelectOptions = {
      placeholder: 'Object',
      dropdownAutoWidth: true,
      query: function(options) {
        debouncedGetEntitiesByName(options.term, options.callback);
      }
  };

  /**
   * Adds more exchanges to the UI
   */
  $scope.addMoreExchanges = function () {
    $scope.exchangeDisplayCount += 10;
  };

  $scope.addEntity = function (exchange) {
    Entity.create(exchange.$entityForm, exchange.$entityForm[Uris.RDF_TYPE].uri).then(function () {
      $scope.showAddRelationship(exchange);
      exchange.newRelationship[exchange.entityName] = exchange.$entityForm;
      exchange.newRelationship[exchange.entityName].text = exchange.$entityForm.name;
    });
  };

  $scope.showCreateEntity = function (exchange, entityName, defaultType) {
    exchange.isAddingRelationship = false;
    exchange.isCreatingEntity = true;
    exchange.entityName = entityName;

    exchange.$entityForm = {};

    if (defaultType === 'Architect') {
      exchange.$entityForm[Uris.RDF_TYPE] = {
          id: 'http://qldarch.net/ns/rdf/2012-06/terms#Architect', 
          uri: 'http://qldarch.net/ns/rdf/2012-06/terms#Architect', 
          text: 'Architect', 
          name: 'Architect', 
          encodedUri: 'aHR0cDovL3FsZGFyY2gubmV0L25zL3JkZi8yMDEyLTA2L3Rlcm1zI0FyY2hpdGVjdA=='
      };
    } else if (defaultType === 'Project') {
      exchange.$entityForm[Uris.RDF_TYPE] = {
          id: 'http://qldarch.net/ns/rdf/2012-06/terms#Structure', 
          uri: 'http://qldarch.net/ns/rdf/2012-06/terms#Structure', 
          text: 'Structure', 
          name: 'Structure',
          encodedUri: 'aHR0cDovL3FsZGFyY2gubmV0L25zL3JkZi8yMDEyLTA2L3Rlcm1zI1N0cnVjdHVyZQ=='
      };
    } else if (defaultType === 'Firm') {
      exchange.$entityForm[Uris.RDF_TYPE] = {
          id: 'http://qldarch.net/ns/rdf/2012-06/terms#Firm', 
          uri: 'http://qldarch.net/ns/rdf/2012-06/terms#Firm', 
          text: 'Firm', 
          name: 'Firm', 
          encodedUri: 'aHR0cDovL3FsZGFyY2gubmV0L25zL3JkZi8yMDEyLTA2L3Rlcm1zI0Zpcm0='
      };
    } else {
      exchange.$entityForm[Uris.RDF_TYPE] = null;
    }
  };

  $scope.typeSelect = {
      placeholder: 'Select a Type',
      dropdownAutoWidth: true,
      multiple: false,
      query: function (options) {
        var data = {
            results: []
        };
        // exchange.isFullName
        angular.forEach(types, function (type) {
          if (type.uri !== Uris.QA_BUILDING_TYPOLOGY && type[Uris.QA_SINGULAR].toLowerCase().indexOf(options.term.toLowerCase()) !== -1) {
            data.results.push({
              id: type.uri,
              uri: type.uri,
              text: type[Uris.QA_SINGULAR],
              name: type[Uris.QA_SINGULAR],
              encodedUri: type.encodedUri,
            });
          }
        });
        data.results.sort(function(a,b) { return a.text.localeCompare(b.text);});
        options.callback(data);
      }
  };

  $scope.typologySelect = {
      placeholder: 'Select a Building Typology',
      dropdownAutoWidth: true,
      multiple: true,
      query: function (options) {
        Entity.loadAll('qldarch:BuildingTypology', true).then(function (typologies) {
          var data = {
              results: []
          };
          angular.forEach(typologies, function (typology) {
            data.results.push({
              id: typology.uri,
              uri: typology.uri,
              text: typology[Uris.QA_LABEL],
              name: typology[Uris.QA_LABEL],
              encodedUri: typology.encodedUri,
            });
          });
          data.results.sort(function(a,b) { return a.text.localeCompare(b.text);});
          options.callback(data);
        });
      }
  };

  /**
   * Shows the add relationship box.
   * 
   * Shows the controls and pauses the audio.
   * 
   * @param {Object}
   *          exchange The exchange to add the relationship
   */
  $scope.showAddRelationship = function (exchange) {
    var subjectSubject;
    var subjectText;
    var predicateSubject;
    var predicateText;
    var objectSubject;
    var objectText;
    var startYearSubject;
    var startYearText;
    var endYearSubject;
    var endYearText;
    var noteSubject;
    var noteText;
    // FIXME: so much type switching its crazy
    if (exchange.newRelationship) {
      subjectSubject = exchange.newRelationship.subject;
      if (exchange.newRelationship.subject) {
        subjectText = exchange.newRelationship.subject.text;
      }
      predicateSubject = exchange.newRelationship.predicate;
      if (exchange.newRelationship.predicate) {
        predicateText = exchange.newRelationship.predicate.text;
      }
      objectSubject = exchange.newRelationship.object;
      if (exchange.newRelationship.object) {
        objectText = exchange.newRelationship.object.text;
      }
      startYearSubject = exchange.newRelationship.startYear;
      if (exchange.newRelationship.startYear) {
        startYearText = exchange.newRelationship.startYear.text;
      }
      endYearSubject = exchange.newRelationship.endYear;
      if (exchange.newRelationship.endYear) {
        endYearText = exchange.newRelationship.endYear.text;
      }
      noteSubject = exchange.newRelationship.note;
      if (exchange.newRelationship.note) {
        noteText = exchange.newRelationship.note.text;
      }
    } else {
      subjectSubject = $scope.interview.interviewees[0];
      subjectText = $scope.interview.interviewees[0].name;
    }

    // Close any other ones that may be open
    angular.forEach($scope.interview.transcript.exchanges, function (exchange) {
      $scope.hideAddRelationship(exchange);
    });
    exchange.isCreatingEntity = false;
    $scope.audioPlayer.pause();
    exchange.isAddingRelationship = true;

    if (subjectSubject) {
      exchange.newRelationship.subject = subjectSubject;
    }
    if (subjectText) {
      exchange.newRelationship.subject.text = subjectText;
    }
    if (predicateSubject) {
      exchange.newRelationship.predicate = predicateSubject;
    }
    if (predicateText) {
      exchange.newRelationship.predicate.text = predicateText;
    }
    if (objectSubject) {
      exchange.newRelationship.object = objectSubject;
    }
    if (objectText) {
      exchange.newRelationship.object.text = objectText;
    }
    if (startYearSubject) {
      exchange.newRelationship.startYear = startYearSubject;
    }
    if (startYearText) {
      exchange.newRelationship.startYear.text = startYearText;
    }
    if (endYearSubject) {
      exchange.newRelationship.endYear = endYearSubject;
    }
    if (endYearText) {
      exchange.newRelationship.endYear.text = endYearText;
    }
    if (noteSubject) {
      exchange.newRelationship.note = noteSubject;
    }
    if (noteText) {
      exchange.newRelationship.note.text = noteText;
    }
  };
 
  /**
   * Removes the add relationship box for an exchange.
   * 
   * @param {Object}
   *          exchange The exchange to close the exchange on
   */
  $scope.hideAddRelationship = function (exchange) {
    exchange.isAddingRelationship = false;
    exchange.isCreatingEntity = false;
    exchange.newRelationship = {};
  };

  $scope.showEditRelationships = function (exchange) {
    // Close any other ones that may be open
    angular.forEach($scope.interview.transcript.exchanges, function (exchange) {
      $scope.hideAddRelationship(exchange);
    });
    $scope.audioPlayer.pause();
    exchange.isEditingRelationships = true;
  };
  $scope.hideEditRelationships = function (exchange) {
    exchange.isEditingRelationships = false;
  };

  /**
   * 
   * @param evidence
   * @param exchange
   */
  $scope.deleteRelationship = function (relationship, exchange) {
    // Splice out the relationship
    var index = exchange.relationships.indexOf(relationship);
    exchange.relationships.splice(index, 1);

    console.log('relationship', relationship);
    angular.forEach(relationship.evidences, function (evidence) {
      $http.delete('/ws/rest/annotation/evidence?ID=' + encodeURIComponent(evidence.uri)).
      catch (function () {
        // Failed to delete
        alert('Whoops, looks like the annotation couldn\'t be deleted at this time.');
        // Put the relationship back in
        exchange.relationships.push(relationship);
      });
    });
  };

  /**
   * 
   * @param {[type]}
   *          relationship [description]
   * @param {[type]}
   *          exchange [description]
   */
  $scope.addRelationshipToExchange = function (relationship, exchange) {

    // Lets build up our request
    var annotation = {};
    annotation[Uris.RDF_TYPE] = relationship.predicate.entailsRelationship;


    annotation[Uris.QA_SUBJECT] = relationship.subject.uri;
    annotation[Uris.QA_PREDICATE] = relationship.predicate.uri;
    annotation[Uris.QA_OBJECT] = relationship.object.uri;

    if (relationship.startYear && relationship.startYear.length) {
      annotation[Uris.QA_START_DATE] = relationship.startYear + '-01-01';
    }
    if (relationship.endYear && relationship.endYear.length) {
      annotation[Uris.QA_END_DATE] = relationship.endYear + '-01-01';
    }
    if (relationship.note && relationship.note.length) {
      annotation[Uris.QA_TEXTUAL_NOTE] = relationship.note;
    }
    annotation[Uris.QA_OBJECT] = relationship.object.uri;

    annotation[Uris.QA_EVIDENCE] = {};
    annotation[Uris.QA_EVIDENCE][Uris.RDF_TYPE] = Uris.QA_EVIDENCE_TYPE;
    annotation[Uris.QA_EVIDENCE][Uris.QA_DOCUMENTED_BY] = $scope.interview.uri;
    annotation[Uris.QA_EVIDENCE][Uris.QA_TIME_FROM] = exchange.startTime;
    annotation[Uris.QA_EVIDENCE][Uris.QA_TIME_TO] = exchange.endTime;

    if (!angular.isDefined(exchange.relationships)) {
      exchange.relationships = [];
    }
    exchange.relationships.push(relationship);
    exchange.newRelationship = {};

    $http.post('/ws/rest/annotation', annotation).then(function (response) {
      // Merge the response in, with our new annotation object
      angular.extend(relationship, response.data);
    });

    $scope.hideAddRelationship(exchange);
  };

  /**
   * Show exchanges that haven't already been spoken
   * 
   * @param exchange
   * @returns {boolean}
   */
  $scope.timeFilter = function (exchange) {
    if ($scope.isSyncing && !$scope.isSearching) {
      if ($scope.audioPlayer.currentTime === 0) {
        return true;
      } else {
        return $scope.audioPlayer.currentTime < exchange.endTime;
      }
    } else {
      return true;
    }
  };

  var nextMatch = 0;

  /**
   * Search for text in the exchanges
   * 
   * @param transcriptSearchInput
   */
  $scope.transcriptSearchInputChanged = function (transcriptSearchInput) {
    $scope.isSearching = true;
    nextMatch = 0;
    $scope.audioPlayer.pause();
    $scope.exchangeDisplayCount = interview.transcript.exchanges.length;

    if (transcriptSearchInput === '') {
      // cleared
      playing();
    }
  };

  $scope.transcriptSearchKeydown = function(e) {
    if (e.keyCode === 13) {
      var m = jQuery('.ui-match');
      if(m.length > 0) {
        if(nextMatch >= m.length) {
          nextMatch = 0;
        }
        jQuery('html, body').scrollTop(jQuery(m[nextMatch++]).offset().top - 20);
      }
    }
  };

  /**
   * Start playing the audio from a specific exchange
   * 
   * @param exchange
   */
  $scope.playFromExchange = function (exchange) {
    $scope.audioPlayer.pause();

    console.log('play from exchange');

    jQuery('html, body').animate({
      scrollTop: jQuery('.player').offset().top + 'px'
    }, 500, 'swing', function () {
      audioPlayerDom.currentTime = exchange.startTime;
      $scope.audioPlayer.currentTime = exchange.startTime;
      $scope.isSyncing = true;
      playing();
      $scope.audioPlayer.play();
    });
  };

});