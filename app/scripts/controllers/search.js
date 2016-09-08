'use strict';

angular.module('angularApp')
    .controller('SearchCtrl', function ($scope,
                                        $location,
                                        $http) {


        activate();

        function activate() {
            $scope.query = $location.search().query;
            $http.get('/ws/search?q=' + $scope.query + '&p=0&pc=20').then(function (response) {
              var data = response.data.documents;
              $.each(data, function(i, item) {
                var path;
                if (item.type === 'person') {
                  path = '/architect/summary?architectId=';
                } else if (item.type === 'firm') {
                  path = '/firm/summary?firmId=';
                } else if (item.type === 'structure') {
                  path = '/project/summary?structureId=';
                } else if (item.type === 'article') {
                  path = '/article?articleId=';
                } else if (item.type === 'interview') {
                  path = '/interview/';
                }
                data[i].link = path + btoa(item.uri);
              });
              $scope.results = data;
            });
        }
    });
