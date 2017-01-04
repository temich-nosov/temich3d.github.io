function processData(records) {
  records.forEach(function(rec) {
    rec.lat = +rec.lat;
    rec.lon = +rec.lon;
    rec.price = +rec.price;
    rec.sq = +rec.sq;
  });

  var ndx = crossfilter(records);

  var priceDim = ndx.dimension((x) => x.price);
  var sqDim    = ndx.dimension((x) => x.sq);
  var phoneDim = ndx.dimension((x) => x.phoneCnt);
  var agencyDim = ndx.dimension((x) => x.agency);
  var allDim   = ndx.dimension((x) => x);

  var priceGroup = priceDim.group();
  var sqGroup    = sqDim.group();
  var phoneGroup = phoneDim.group();
  var agencyGroup= agencyDim.group();
  var all        = ndx.groupAll();

  var minPrice = priceDim.bottom(1)[0]['price'];
  var maxPrice = priceDim.top(1)[0]['price'];

  var minSq = sqDim.bottom(1)[0]['sq'];
  var maxSq = sqDim.top(1)[0]['sq'];

  var minPhone = 1;
  var maxPhone = phoneDim.top(1)[0]['phoneCnt'];

  var numberRecordsND = dc.numberDisplay('#numberRecords');
  var priceChart      = dc.barChart('#priceChart');
  var sqChart         = dc.barChart('#sqChart');
  var phoneChart      = dc.barChart('#numberPhone');
  var agencyRowChart  = dc.rowChart('#agency')

  numberRecordsND
    .formatNumber(d3.format("d"))
    .valueAccessor((x) => x)
    .group(all);

  priceChart.width(400).height(150);
  priceChart.margins({ top: 10, right: 50, bottom: 20, left: 40 });
  priceChart.dimension(priceDim).group(priceGroup);
  priceChart.x(d3.scale.linear().domain([minPrice, maxPrice]));
  priceChart.elasticY(true);
  priceChart.yAxis().ticks(4);
  priceChart.transitionDuration(500);

  sqChart.width(400);
  sqChart.height(150);
  sqChart.margins({ top: 10, right: 50, bottom: 20, left: 40 });
  sqChart.dimension(sqDim);
  sqChart.group(sqGroup);
  sqChart.transitionDuration(500);
  sqChart.x(d3.scale.linear().domain([minSq, maxSq]));
  sqChart.elasticY(true);
  sqChart.yAxis().ticks(4);

  phoneChart.width(400);
  phoneChart.height(150);
  phoneChart.margins({ top: 10, right: 50, bottom: 20, left: 40 });
  phoneChart.dimension(phoneDim);
  phoneChart.group(phoneGroup);
  phoneChart.transitionDuration(500);
  phoneChart.x(d3.scale.linear().domain([minPhone, maxPhone]));
  phoneChart.elasticY(true);
  phoneChart.yAxis().ticks(4);

  agencyRowChart.width(200);
  agencyRowChart.height(150);
  agencyRowChart.dimension(agencyDim);
  agencyRowChart.group(agencyGroup);
  agencyRowChart.colors(['#6baed6']);
  agencyRowChart.elasticX(true);
  agencyRowChart.xAxis().ticks(4);


  var map = L.map('map').setView([48.5, 44.5], 9);
  var drawMap = function() {
    var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
    L.tileLayer(
      'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '---'
      }).addTo(map);

    var geoData = [];
    _.each(allDim.top(Infinity), function (d) {
      geoData.push([d["lat"], d["lon"], 1]);
    });

    var heat = L.heatLayer(geoData,{
      radius: 10,
      blur: 20, 
      maxZoom: 1,
    }).addTo(map);
  }

  dcCharts = [priceChart, sqChart, phoneChart];

  _.each(dcCharts, function (dcChart) {
    dcChart.on("filtered", function (chart, filter) {
      map.eachLayer(function (layer) {
        map.removeLayer(layer)
      }); 
      drawMap();
    });
  });

  dc.renderAll();
  drawMap();
}

$.getJSON("showId.json", processData);

//q .defer(d3.json, "data.json")
//  .await(processData);

/*
   function processData2(data) {
   var ndx = crossfilter(data);

   var iDim   = ndx.dimension((x) => x['i']);
   var xDim   = ndx.dimension((x) => x['x']);
   var allDim = ndx.dimension((x) => x);

   var iGroup = iDim.group();
   var xGroup = xDim.group();
   var all    = ndx.groupAll();

  var minI = 0;
  var maxI = 100;

  var iChart = dc.barChart('#priceChart');

  iChart
    .width(650)
    .height(150)
    .x(d3.scaleLinear().domain([minI, maxI]))
    .dimension(iDim)
    .group(iGroup)
    .yAxis().ticks(4);
  iChart.render();
}

var data = [];
var i = 0;
for (i = 0; i < 100; ++i) {
  data.push({
    'i' : i,
    'x' : Math.random() > 0.5 ? +1 : 0
  });
}

processData2(data);
*/
