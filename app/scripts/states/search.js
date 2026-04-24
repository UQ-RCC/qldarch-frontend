'use strict';

angular.module('qldarchApp').config(
    function($stateProvider) {
      $stateProvider.state('search', {
        url : '/search?query&fieldquery',
        templateUrl : 'views/search.html',
        resolve : {
          architects : [ 'AggArchObjs', 'GraphHelper', '$filter', function(AggArchObjs, GraphHelper, $filter) {
            return AggArchObjs.loadArchitects().then(function(data) {
              var architects = GraphHelper.graphValues(data);
              return $filter('filter')(architects, function(architect) {
                return architect.label && !(/\s/.test(architect.label.substring(0, 1)));
              });
            }).catch(function() {
              //console.log('unable to load all architects');
              return {};
            });
          } ],
          firms : [ 'AggArchObjs', '$filter', function(AggArchObjs, $filter) {
            return AggArchObjs.loadFirms().then(function(data) {
              return $filter('filter')(data, function(firm) {
                return firm.label && !(/\s/.test(firm.label.substring(0, 1)));
              });
            }).catch(function() {
              //console.log('unable to load all firms');
              return {};
            });
          } ],
          structures : [ 'AggArchObjs', function(AggArchObjs) {
            return AggArchObjs.loadProjects().then(function(data) {
              return data;
            }).catch(function() {
              //console.log('unable to load all projects');
              return {};
            });
          } ],
          personnotarchitect : [ 'AggArchObjs', function(AggArchObjs) {
            return AggArchObjs.loadPersonNotArchitect().then(function(data) {
              return data;
            }).catch(function() {
              //console.log('unable to load person non-architect');
              return {};
            });
          } ],
          othersnotperson : [ 'AggArchObjs', function(AggArchObjs) {
            return AggArchObjs.loadOthersNotPerson().then(function(data) {
              return data;
            }).catch(function() {
              //console.log('unable to load others non-person');
              return {};
            });
          } ],
          

       searchresult : [
  '$location', '$http', 'Uris', 'WordService',
  'architects', 'firms', 'structures', 'personnotarchitect', 'othersnotperson', '$filter',
  function($location, $http, Uris, WordService, architects, firms, structures, personnotarchitect, othersnotperson, $filter) {

    var query = $location.search().query;
    var q = '';
    var cleanQuery = '';
    if (angular.isDefined(query) && query) {
      cleanQuery = query.replace(WordService.spclCharsLucene, '').trim().toLowerCase();
      q = cleanQuery + '*';
    }

    var fieldquery = $location.search().fieldquery;
    var fq = '';
    if (angular.isDefined(fieldquery) && fieldquery) {
      fq = ' ' + fieldquery.toLowerCase();
    }

    var combinedQuery = encodeURIComponent(q + fq);

    var countUrl = Uris.WS_ROOT + 'search?q=' + combinedQuery + '&p=0&pc=0';

    return $http.get(countUrl).then(function(resp) {
      var totalHits = resp.data.hits;

      if (totalHits === 0) {
        return {
          query: (q + fq).replace(/[()"*]/g, ''),
          totalItems: 0,
          data: []
        };
      }

      var fetchCount = Math.min(totalHits, 75);
      var dataUrl = Uris.WS_ROOT + 'search?q=' + combinedQuery + '&p=0&pc=' + fetchCount;

      return $http.get(dataUrl).then(function(response) {
        var docs = response.data.documents;

        var queryWords = cleanQuery.split(' ').filter(function(w) { return w.length > 0; });

        docs = docs.map(function(doc) {
          var label = (doc.label || '').toLowerCase();
          var relevance = 0;

          if (label === cleanQuery) {

            relevance = 5;
          } else if (label.startsWith(cleanQuery)) {
            // label starts with full query
            relevance = 4;
          } else if (label.indexOf(cleanQuery) !== -1) {
            // label contains full query anywhere
            relevance = 3;
          } else {
            // check how many individual query words appear in label
            var matchedWords = queryWords.filter(function(word) {
              return label.indexOf(word) !== -1;
            });
            if (matchedWords.length === queryWords.length) {
              // all words matched
              relevance = 2;
            } else if (matchedWords.length > 0) {
              // some words matched
              relevance = 1;
            }
          }

          doc._relevance = relevance;
          return doc;
        });

        // Remove results with no label match at all, sort by relevance desc
        docs = docs
          .filter(function(doc) { return doc._relevance > 0; })
          .sort(function(a, b) { return b._relevance - a._relevance; });

        // Category grouping (preserving relevance order within each group)
        var architectsDocs = $filter('filter')(docs, function(result) {
          return result.architect === true;
        });
        var firmsDocs = $filter('filter')(docs, function(result) {
          return result.type === 'firm';
        });
        var structuresDocs = $filter('filter')(docs, function(result) {
          return result.type === 'structure';
        });
        var interviews = $filter('filter')(docs, function(result) {
          return result.type === 'interview';
        });
        var articles = $filter('filter')(docs, function(result) {
          return result.type === 'article';
        });
        var articlefiles = $filter('filter')(docs, function(result) {
          return result.type === 'Article';
        });
        var others = $filter('filter')(docs, function(result) {
          return result.architect !== true &&
                 result.type !== 'firm' &&
                 result.type !== 'structure' &&
                 result.type !== 'interview' &&
                 result.type !== 'article' &&
                 result.type !== 'Article';
        });

        var data = architectsDocs.concat(firmsDocs, structuresDocs, interviews, articles, articlefiles, others);

        /* globals $:false */
        $.each(data, function(i, item) {
          var path;
          if (item.type === 'person' && item.architect === true) {
            path = '/architect/summary?architectId=';
            angular.forEach(architects, function(architect) {
              if (item.id === architect.id && angular.isDefined(architect.media)) {
                data[i].media = architect.media;
              }
            });
          } else if (item.type === 'person' && item.architect === false) {
            path = '/other/summary?otherId=';
            angular.forEach(personnotarchitect, function(person) {
              if (item.id === person.id && angular.isDefined(person.media)) {
                data[i].media = person.media;
              }
            });
          } else if (item.type === 'firm') {
            path = '/firm/summary?firmId=';
            angular.forEach(firmsDocs, function(firm) {
              if (item.id === firm.id && angular.isDefined(firm.media)) {
                data[i].media = firm.media;
              }
            });
          } else if (item.type === 'structure') {
            path = '/project/summary?structureId=';
            angular.forEach(structuresDocs, function(structure) {
              if (item.id === structure.id && angular.isDefined(structure.media)) {
                data[i].media = structure.media;
              }
            });
          } else if (item.type === 'article') {
            path = '/article?articleId=';
            if (item.published) {
              item.published = item.published.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            }
          } else if (item.category === 'media') {
            path = '/media/download/';
          } else if (item.type === 'interview') {
            path = '/interview/';
          } else {
            path = '/other/summary?otherId=';
            angular.forEach(othersnotperson, function(other) {
              if (item.id === other.id && angular.isDefined(other.media)) {
                data[i].media = other.media;
              }
            });
          }
          data[i].link = path + item.id;
        });

        console.log('search results', data);

        return {
          query: (q + fq).replace(/[()"*]/g, ''),
          totalItems: data.length,
          data: data
        };
      });
    });
  }
]
        },
        controller : 'SearchCtrl'
      });
    });