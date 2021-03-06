'use strict';

angular.module('qldarchApp').directive(
    'force',
    function($state, Uris) {
      var LINK_DISTANCE = 100;
      var CHARGE = -1500;

      return {
        template : '<div></div>',
        restrict : 'E',
        scope : {
          data : '=',
          selected : '&'
        },
        replace : true,
        link : function postLink($scope, element) {

          // Setup the height and width
          var forceWidth = element.width(), forceHeight;
          var nodeslength = $scope.data.nodes.length;
          if (nodeslength <= 5) {
            forceHeight = 350;
          } else if (5 < nodeslength && nodeslength < 45) {
            forceHeight = 600;
          } else if (45 <= nodeslength && nodeslength <= 90) {
            forceHeight = 800;
          } else if (90 < nodeslength && nodeslength <= 130) {
            forceHeight = 950;
          } else if (nodeslength > 130) {
            forceHeight = 1050;
          }

          // Setup the SVG
          var svg = d3.select(element.get(0)).append('svg').attr('width', forceWidth).attr('height', forceHeight).on('click', function() {
            d3.selectAll('.node').classed('selected', false);
            $scope.$apply(function() {
              $scope.selected({
                node : null
              });
            });
          });

          // SVG elements
          var node = svg.selectAll('.node'), link = svg.selectAll('.link');

          function linksGui() {
            // Update links
            link = link.data($scope.data.links);

            // Enter links
            link.enter().append('line').attr('class', 'link');

            // Exit links
            link.exit().remove();
          }

          function nodesGui(force) {
            // Update nodes
            node = svg.selectAll('.node').data($scope.data.nodes, function(d) {
              return d.id;
            });

            // Enter Nodes
            var newNodesElements = node.enter().append('g');
            newNodesElements.attr('class', function(d) {
              var classes = 'node ' + 'node-' + d.type;
              if (d.type === 'person' && !d.practicedinqueensland) {
                classes += ' node-person-nonqueensland';
              }
              return classes;
            }).on('click', function(d) {
              // console.log('selected', d.$selected);
              d3.selectAll('.node').classed('selected', false);
              d3.select(this).classed('selected', true);
              $scope.$apply(function() {
                $scope.selected({
                  node : d
                });
              });
              d3.event.stopPropagation();
            }).on('dblclick', function(d) {
              if (d.type) {
                // console.log('going to', d.type + '.relationships', params);
                var params = {};
                if (d.type === 'person' && d.architect === true) {
                  params.architectId = d.id;
                  $state.go('architect.relationships', params);
                } else if (d.type === 'person' && d.architect === false) {
                  params.otherId = d.id;
                  $state.go('other.relationships', params);
                } else if (d.type === 'firm') {
                  params.firmId = d.id;
                  $state.go('firm.relationships', params);
                } else if (d.type === 'structure') {
                  params.structureId = d.id;
                  $state.go('structure.relationships', params);
                } else if (d.type === 'Article') {
                  params.articleId = d.id;
                  $state.go('article', params);
                } else if (d.type === 'interview') {
                  params.interviewId = d.id;
                  $state.go('interview', params);
                } else {
                  params.otherId = d.id;
                  $state.go('other.relationships', params);
                }
              }
              d3.event.stopPropagation();
            }).call(force.drag);

            newNodesElements.append('circle').attr('r', function(d) {
              if (angular.isDefined(d.media)) {
                return 10 * d.count.clamp(1.5, 5);
              } else {
                return 10 * d.count.clamp(1, 5);
              }
            });

            newNodesElements.append('defs').append('pattern').attr('id', function(d) {
              return (d.id + '-icon');
            }).attr('width', 1).attr('height', 1).attr('patternContentUnits', 'objectBoundingBox').append('svg:image').attr('xlink:xlink:href',
                function(d) {
                  if (angular.isDefined(d.media)) {
                    var dimension = ((10 * d.count.clamp(1.5, 5)) - 5) * 2;
                    return (Uris.WS_MEDIA + d.media + '?dimension=' + dimension + 'x' + dimension);
                  }
                }).attr('x', 0).attr('y', 0).attr('height', 1).attr('width', 1).attr('preserveAspectRatio', 'xMinYMin slice');

            newNodesElements.append('circle').attr('r', function(d) {
              if (angular.isDefined(d.media)) {
                return (10 * d.count.clamp(1.5, 5)) - 5;
              }
            }).style('stroke', 'none').style('fill', function(d) {
              if (angular.isDefined(d.media)) {
                return ('url(#' + d.id + '-icon)');
              }
            });

            newNodesElements.append('text').attr('x', function(d) {
              return 10 * d.count.clamp(1, 5) + 5;
            }).attr('dy', '.35em').attr('fill', 'black').text(function(d) {
              return d.label;
            });

            // Exit Nodes
            node.exit().remove();
          }

          function start() {
            // Creates the force graph
            // console.log('starting data', $scope.data);
            var force = d3.layout.force().nodes($scope.data.nodes).links($scope.data.links).size([ forceWidth, forceHeight ]).linkDistance(
                LINK_DISTANCE).charge(CHARGE).on('tick', function() {
              link.attr('x1', function(d) {
                return d.source.x;
              }).attr('y1', function(d) {
                return d.source.y;
              }).attr('x2', function(d) {
                return d.target.x;
              }).attr('y2', function(d) {
                return d.target.y;
              });
              node.attr('transform', function(d) {
                return 'translate(' + d.x + ',' + d.y + ')';
              });
            });

            linksGui();
            nodesGui(force);
            force.start();
          }

          // Watches the data for changes
          $scope.$watch('data', function(data) {
            // console.log('data is', data);
            if (data) {
              start();
            }
          });
        }
      };
    });