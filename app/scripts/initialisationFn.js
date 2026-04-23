'use strict';

angular.module('qldarchApp').run(function($rootScope, $route, $location, ngProgress, Uris, $http, GraphHelper, $state, $stateParams, Auth, $filter, WordService) {

  // Fix bug with scrolling to top with ui-router changing
  $rootScope.$on('$viewContentLoaded', function() {
    var interval = setInterval(function() {
      if (document.readyState === 'complete') {
        window.scrollTo(0, 0);
        clearInterval(interval);
      }
    }, 200);
  });

  $rootScope.$state = $state;
  $rootScope.$stateParams = $stateParams;
  $rootScope.Auth = Auth;
  $rootScope.Uris = Uris;
  $rootScope.tinymceOptions = {
    plugins : 'paste',
    /* jshint camelcase: false */
    paste_as_text : true,
    menubar : false,
    toolbar : 'bold | italic',
    statusbar : true,
    resize: true,
    elementpath: false
  };

  $http.get(Uris.WS_ROOT + 'user').then(function(status) {
    if (status.data.id) {
      Auth.success = true;
      Auth.user = status.data;
      //console.log('Auth is', status.data.username);
    }
  });

 /*  $rootScope.globalSearch = {};
  $rootScope.globalSearch.query = ''; */
  $rootScope.globalSearch = { query: '' };
  $rootScope.globalSearchModel = { query: '' };

  // Adds the slim progress bar
  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
    //console.log('changing', event, toState, toParams, fromState, fromParams);
    ngProgress.reset();
    ngProgress.color('#ea1d5d');
    ngProgress.start();
    $state.previous = fromState.name;
    $state.previousParams = fromParams;
  });
  $rootScope.$on('$stateChangeSuccess', function() {
    ngProgress.complete();
    $rootScope.globalSearchModel.query = '';
  });
  $rootScope.$on('$stateChangeError', function() {
    ngProgress.reset();
    ngProgress.reset();
  });

  /**
   * Finds entities with matching names
   * 
   * @param val
   * @returns {Promise|*}
   */
  var searchTimeout = null;

$rootScope.globalSearchTypeahead = function(val) {
  console.log('globalSearchTypeahead called with:', val);
  if (!val || val.trim() === '') {
    return [];
  }

  // Cancel any pending request
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  var sanitizedVal = val.replace(WordService.spclCharsLucene, '').trim().toLowerCase();
  var url = Uris.WS_ROOT + 'search?q=' + encodeURIComponent(
    '(label:' + sanitizedVal + '* OR all:' + sanitizedVal + '*) AND (type:person OR type:firm OR type:structure) AND category:archobj'
  ) + '&p=0&pc=100';

  return $http.get(url).then(function(output) {
    var results = GraphHelper.graphValues(output.data.documents);

    results = $filter('filter')(results, function(result) {
      return (result.type === 'person' || result.type === 'firm' || result.type === 'structure');
    });

    results = $filter('orderBy')(results, function(result) {
      var label = result.label ? result.label.toLowerCase() : '';
      var searchTerm = sanitizedVal.toLowerCase();
      if (label.indexOf(searchTerm) === 0) {
        return '0' + label;
      } else if (label.indexOf(searchTerm) > 0) {
        return '1' + label;
      } else {
        return '2' + label;
      }
    });

    results = results.slice(0,10);

    angular.forEach(results, function(result) {
      result.name = result.label;
      var label = result.name + ' (' + result.type.charAt(0).toUpperCase() + result.type.slice(1) + ')';
      if (result.type === 'structure') {
        label = result.name + ' (Project)';
      }
      result.name = label;
    });

    var search = {
      name: 'Search for \'' + val + '\'',
      type: 'search',
      query: val
    };

    results.unshift(search);
    console.log('Returning results:', results.map(function(r) { return r.name; }));

    return results;

  }, function(error) {
    console.error('Search failed:', error);
    return [{
      name: 'Search for \'' + val + '\'',
      type: 'search',
      query: val
    }];
  });
};
  /* $rootScope.globalSearch = function(val) {
    if (!val || val.trim() === '') {
      return [];
    }
    var sanitizedVal = val.replace(WordService.spclCharsLucene, '').trim();
    var syntax = ' AND (type:person OR type:firm OR type:structure) AND category:archobj';
    return $http.get(Uris.WS_ROOT + 'search?q=' + val.replace(WordService.spclCharsLucene, '') + syntax + '&p=0&pc=20').then(function(output) {
      var results = GraphHelper.graphValues(output.data.documents);
      results = $filter('filter')(results, function(result) {
        return (result.type === 'person' || result.type === 'firm' || result.type === 'structure');
      });
      results = $filter('orderBy')(results, function(result) {
        return result.label.length;
      });
      results = results.slice(0, 10);

      angular.forEach(results, function(result) {
        result.name = result.label;
        var label = result.name + ' (' + result.type.charAt(0).toUpperCase() + result.type.slice(1) + ')';
        if (result.type === 'structure') {
          label = result.name + ' (Project)';
        }
        result.name = label;
      });

      var search = {
        name : 'Search for \'' + val + '\'',
        type : 'search',
        query : val
      };
      console.log('results are', search, results);
      results.unshift(search);
      return results;
    });
  }; */

  /**
   * 
   * @param $item
   * @param $model
   * @param $label
   */
  $rootScope.globalSearchOnSelect = function($item, $model, $label) {
    console.log('Selected item:', $item);
    console.log('Selected model:', $model);
    console.log('Selected label:', $label);

    if ($item.type === 'search') {
      // special case
     // $rootScope.globalSearch.query = $item.query;
      $rootScope.globalSearchModel.query = $item.query;
      $model = $item.query;
      $location.search({});
      $location.path('/search');
      $location.search('query', $item.query);
    } else {
      // already a result
      console.log('path is', $item);
      var params = {};
      if ($item.type === 'person' && $item.architect === true) {
        params.architectId = $item.id;
        $state.go('architect.summary', params);
      } else if ($item.type === 'person' && $item.architect === false) {
        params.otherId = $item.id;
        $state.go('other.summary', params);
      } else if ($item.type === 'firm') {
        params.firmId = $item.id;
        $state.go('firm.summary', params);
      } else if ($item.type === 'structure') {
        params.structureId = $item.id;
        $state.go('structure.summary', params);
      } else if ($item.type === 'Article') {
        params.articleId = $item.id;
        $state.go('article', params);
      } else if ($item.type === 'interview') {
        params.interviewId = $item.id;
        $state.go('interview', params);
      }
    }
  };

});