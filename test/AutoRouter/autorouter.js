/*globals describe,it*/
/*
 * brollb
 */

'use strict';
var utils = require('./autorouter.common.js'),
    assert = utils.assert,
    router;

// Tests
describe('AutoRouter Tests', function(){

  it('should create boxes placed on graph',function(){
      router = utils.getNewGraph();
      var ports = utils.addBox({x: 100,
                          y: 100});

      var boxCount = Object.keys(router.graph.boxes).length;
      assert(boxCount === 3, 'box count should be 3 but is '+boxCount);
  });

  it('should move box on graph',function(){
      router = utils.getNewGraph();
      var box = utils.addBox({x: 100,
                        y: 100});

      router.move(box, {x: 300, y: 300});
  });

  it('should remove box from graph',function(){
      router = utils.getNewGraph();
      var box = utils.addBox({x: 100,
                        y: 100});

      router.remove(box);
      var boxCount = Object.keys(router.graph.boxes).length;
      assert(boxCount === 0, 'box count should be 0 but is ' + boxCount);
  });

  it('should create basic paths',function(){
      router = utils.getNewGraph();

      var box1 = utils.addBox({x: 100, y: 100}),
          box2 = utils.addBox({x: 900, y: 900}),
          path;

      router.addPath({src: box2.ports[0], dst: box1.ports[1]});
      path = router.graph.paths[0];

      router.routeSync();
      assert(path.points.length > 2, 
            'Path does not contain enough points to have been routed');

  });

  it('should detect bracket opening',function(){
      router = utils.getNewGraph();

      var box1 = utils.addBox({x: 100, y: 100});
      router.addPath({src: box1.ports[0], dst: box1.ports[1]});
      router.routeSync();

      // Check that the graph contains an edge that is bracket closing or opening
      var hasBracketOpeningOrClosing = false;
      var testFn = function(edge) {
          return edge.bracketOpening || edge.bracketOpening || edge.bracket_closing || edge.bracket_opening;
      };
      hasBracketOpeningOrClosing = utils.evaluateEdges(router.graph.horizontal, testFn) ||
                                   utils.evaluateEdges(router.graph.vertical, testFn);

      assert(hasBracketOpeningOrClosing, 
      'Did not detect bracket opening/closing'+(router.graph.dumpEdgeLists()||''));
  });

  it('should remove port from box',function(){
      router = utils.getNewGraph();
      throw new Error('Need to make this test');
  });

  it('should connect two boxes',function(){
      router = utils.getNewGraph();

      var box1 = utils.addBox({x: 100, y: 100});
      var box2 = utils.addBox({x: 500, y: 800});
      utils.connectAll([box1, box2]);
  });

  it('should connect multiple boxes',function(){
      router = utils.getNewGraph();
      var locations = [[100,100],
                       [500,300],
                       [300,300]],
          boxes = utils.addBoxes(locations);

      utils.connectAll(boxes);
  });

  it('should move connected boxes',function(){
      router = utils.getNewGraph();
      var locations = [[100,100],
                       [500,800],
                       [500,300],
                       [300,300]],
          boxes = utils.addBoxes(locations),
          i,
          j;

      for (i = boxes.length; i--;) {
          for (j = boxes.length; j--;) {
              router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
          }
          router.move(boxes[i], {x: 600, y: 600});
      }

  });

  it('should connect overlapping boxes',function(){
      router = utils.getNewGraph();
      var locations = [[100,100],
                       [110,110],
                       [120,120],
                       [130,130]],
          boxes = utils.addBoxes(locations),
          i,
          j;

      for (i = boxes.length; i--;) {
          for (j = boxes.length; j--;) {
              router.addPath({src: boxes[i].ports, dst: boxes[j].ports});
          }
      }

  });

  it.only('should connect contained boxes',function(){
      router = utils.getNewGraph();
      var width = 900,
          height = 900,
          locations = [[100,100], 
                       [200, 200], 
                       [400, 400],
                       [4100, 4100],
                       [4200, 4200],
                       [4400, 4400]],
          boxes = [],
          i,
          j;

      // Create big boxes
      for (i = locations.length; i--;) {
          boxes.push(utils.addBox({x: locations[i][0],
                             y: locations[i][1],
                             width: width,
                             height: height}));
        
      }

      assert(boxes[0].box.rect.getWidth() === 900);

      // Create normal sized boxes
      for (i = locations.length; i--;) {
          boxes.push(utils.addBox({x: locations[i][0],
                             y: locations[i][1]}));
      }

      utils.connectAll(boxes);
  });

  it('should remove path from graph',function(){
      router = utils.getNewGraph();

      var box1 = utils.addBox({x: 100, y: 100});
      var box2 = utils.addBox({x: 500, y: 800});
      var path = router.addPath({src: box1.ports, dst: box2.ports});
      router.remove(path);
      assert(router.graph.paths.length === 0);
  });

  it('should create ports outside the box',function(){
      router = utils.getNewGraph();
      var box = utils.addBox({x: 100, y: 100});
      var port = utils.addBox({x: 110, y: 110, width: 30, height: 30});
      router.setComponent(box, port);
  });

  it('should connect port to parent box',function(){
      router = utils.getNewGraph();
      var box = utils.addBox({x: 100, y: 100});
      var port = utils.addBox({x: 110, y: 110, width: 30, height: 30});
      router.setComponent(box, port);
      utils.connectAll([box, port]);
  });

  it('should connect box encircled by other boxes',function(){
      router = utils.getNewGraph();
      var locations = [],
          change = 90,
          min = 100,
          max = 1000,
          diff = 2000,
          x = 400,
          y = 400,
          src = utils.addBox({x: x, y: y}),
          dst = utils.addBox({x: x+diff, y: y+diff});

      // Encircle the src box
      for (y = min, x = min; y < max; y += change) {
          utils.addBox({x: x, y: y});
          utils.addBox({x: max, y: y});
      }

      for (y = min, x = min; x < max; x += change) {
          utils.addBox({x: x, y: y});
          utils.addBox({x: x, y: max});
      }

      utils.connectAll([src, dst]);

      // Encircle the dst box
      min = diff;
      for (y = min, x = min; y < max; y += change) {
          utils.addBox({x: x, y: y});
          utils.addBox({x: max, y: y});
      }

      for (y = min, x = min; x < max; x += change) {
          utils.addBox({x: x, y: y});
          utils.addBox({x: x, y: max});
      }

      router.routeSync();
  });

  it('should create connection areas outside the box',function(){
      router = utils.getNewGraph();

      var boxDef = {x1: 100,
                    x2: 200,
                    y1: 100,
                    y2: 200,
                    ports: [
                       {id: 'top', 
                        area: [ [10, 800], [80, 800] ]}
                    ]};

      var src = router.addBox(boxDef),
          dst = utils.addBox({x: 600, y: 800});
      utils.connectAll([src, dst]);
  });

  it('should allows connections between immediately overlapping boxes',function(){
      router = utils.getNewGraph();
      var boxes = utils.addBoxes([[100,100], [100,100]]);
      utils.connectAll(boxes);
  });

  it('should be able to resize boxes', function() {
      router = utils.getNewGraph();
      var box = utils.addBox({x: 100, y: 100});
      var newBox = {x1: 50,
                    y1: 50, 
                    x2: 300,
                    y2: 300,
                    ports: [
                     {id: 'top',
                      area: [ [60, 60], [290, 60]]},
                     {id: 'bottom',
                      area: [ [60, 290], [290, 290]]}
                  ]};
      router.setBoxRect(box, newBox);
  });

  it('should be able to resize routed boxes', function() {
      router = utils.getNewGraph();
      var boxes = utils.addBoxes([[100,100], [300,300]]);
      utils.connectAll(boxes);

      var newBox = {x1: 50,
                    y1: 50, 
                    x2: 300,
                    y2: 300,
                    ports: [
                     {id: 'top',
                      area: [ [60, 60], [290, 60]]},
                     {id: 'bottom',
                      area: [ [60, 290], [290, 290]]}
                  ]};

      router.setBoxRect(boxes[0], newBox);
      router.routeSync();

  });

  it('should be able to route asynchronously', function(done) {
      router = utils.getNewGraph();

      var box1 = utils.addBox({x: 100, y: 100}),
          box2 = utils.addBox({x: 900, y: 900});

      router.addPath({src: box2.ports[0], dst: box1.ports[1]});

      router.routeAsync({
          callback: function(paths) {
              var path = paths[0];
              assert(path.points.ArPointList.length > 2, 
                    'Path does not contain enough points to have been routed');
              done();
          }
      });
  });
});

// Tests for the autorouter
//  - changing the size of boxes
//  - changing the size of ports
//  - maze
//  - remove ports
//  - removing path should remove start/end points from ports
//
//  - Boxes
//    - move propogates to children
//    - add/remove port
//
//  - Ports
//    - port available area
//      - adjust
//      - clear
