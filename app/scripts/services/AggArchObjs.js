'use strict';

angular.module('qldarchApp').factory('AggArchObjs', function($http, $cacheFactory, Uris) {

  // Public API here
  var aggarchobjs = {
    clearAll : function() {
      $cacheFactory.get('$http').removeAll();
    },

    loadAll : function(opt) {
      return $http.get(Uris.WS_ROOT + 'archobjs', {params: opt}).then(function(result) {
        angular.forEach(result.data, function(d){
          d.typelabel = d.type.charAt(0).toUpperCase() + d.type.slice(1);
          if (d.type === 'person') {
            d.typelabel += ' - ' + (d.architect?'Architect':'Other');
          }
        });
        return result.data;
      }).catch(function() {
        return [];
      });
    },

    loadAllPerson : function() {
      return this.loadAll({type: 'person', deleted: false, size: 10000});
    },
    loadAllArchitects : function() {
      return this.loadAll({type: 'person', architect: true, deleted: false, size: 10000});
    },
    loadArchitects : function() {
      return $http.get(Uris.WS_ROOT + 'architects').then(function(result) {
        //console.log('load architects');
        return result.data;
      });
    },

    loadAllFirms : function() {
      return this.loadAll({type: 'firm', deleted: false, size: 10000});
    },
    loadFirms : function() {
      return $http.get(Uris.WS_ROOT + 'firms').then(function(result) {
        //console.log('load firms');
        return result.data;
      });
    },

    loadAllProjects : function() {
      return this.loadAll({type: 'structure', deleted: false, size: 10000});
    },
    loadProjects : function() {
      return $http.get(Uris.WS_ROOT + 'projects').then(function(result) {
        console.log('load projects');
        console.log('Total projects returned:', result.data.length);
        return result.data;
      });
    },

    loadInterviews : function() {
      return $http.get(Uris.WS_ROOT + 'interviews').then(function(result) {
        //console.log('load interviews');
        return result.data;
      });
    },

    loadInterviewsBrief : function() {
      return $http.get(Uris.WS_ROOT + 'interviews/brief').then(function(result) {
        //console.log('load interviews brief');
        return result.data;
      });
    },

    loadArticles : function() {
      return $http.get(Uris.WS_ROOT + 'articles').then(function(result) {
        //console.log('load articles');
        return result.data;
      });
    },

    loadPersonNotArchitect : function() {
      return $http.get(Uris.WS_ROOT + 'others/person/notarchitect').then(function(result) {
        //console.log('load person non-architect');
        return result.data;
      });
    },

    loadOthersNotPerson : function() {
      return $http.get(Uris.WS_ROOT + 'others/notperson').then(function(result) {
        //console.log('load others non-person');
        return result.data;
      });
    }
  };

  return aggarchobjs;
});