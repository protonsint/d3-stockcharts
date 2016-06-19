/*
  Affichage des cours avec D3
  Sylvain Durand – MIT license
*/


function stocks() {

  this.init = function() {

    var margin = {top: 30, right: 10, bottom: 100, left: 40},
        margin2 = {top: 430, right: 10, bottom: 20, left: 40},
        width = 800 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom,
        height2 = 500 - margin2.top - margin2.bottom;

    var x = d3.time.scale().range([0, width]),
        x2 = d3.time.scale().range([0, width]),
        y = d3.scale.linear().range([height, 0]),
        y2 = d3.scale.linear().range([height2, 0]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(format),
        xAxis2 = d3.svg.axis().scale(x2).orient("bottom"),
        yAxis =  d3.svg.axis().scale(y).orient("left");

    var brush = d3.svg.brush()
        .x(x2)
        .on("brush", brushed);

    var area = d3.svg.line()
        .interpolate("basis")
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.price); });

    var area2 = d3.svg.area()
        .interpolate("monotone")
        .x(function(d) { return x2(d.date); })
        .y0(height2)
        .y1(function(d) { return y2(d.price); });

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var graph = svg.append("g")
        .attr("class", "graph")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var map = svg.append("g")
        .attr("class", "map")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    d3.json('json/assets/FR0000077919.json', function(err, data) {

      var d = []
      for (i in data) {
        d.push({
          'price': parseFloat(data[i]),
          'date': d3.time.format('%Y-%m-%d').parse(i)
        })
      }
      data = d

      x.domain(d3.extent(data.map(function(d) { return d.date; })));
      y.domain([0, d3.max(data.map(function(d) { return d.price; }))]);
      x2.domain(x.domain());
      y2.domain(y.domain());

      graph.append("path")
          .datum(data)
          .attr("class", "line")
          .attr("d", area)
          .style("clip-path", " url(#clip)");

      graph.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      graph.append("g")
          .attr("class", "y axis")
          .call(yAxis);

      map.append("path")
          .datum(data)
          .attr("class", "area")
          .attr("d", area2)
          .style("clip-path", " url(#clip)");

      map.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height2 + ")")
          .call(xAxis2);

      map.append("g")
          .attr("class", "x brush")
          .call(brush)
          .selectAll("rect")
          .attr("y", -6)
          .attr("height", height2 + 7);

      var focus = svg.append("g")
            .attr("class", "focus")
            .style("display", "none");

          focus.append("circle")
            .attr("r", 2.5)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var helper = graph.append('g')
          .style('text-anchor', 'end')
          .attr('transform', 'translate(' + width + ', -5)');

      var text = helper.append('text')
                 .attr('class', 'valeurs');

      svg.append("rect")
          .attr("class", "overlay")
          .attr("width", width)
          .attr("height", height)
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
          .on("mouseover", function() { focus.style("display", null); })
          .on("mouseout", function() { focus.style("display", "none"); })
          .on("mousemove", function() {
              var x0 = x.invert(d3.mouse(this)[0]),
                  i = d3.bisector(function(d) { return d.date; }).left(data, x0, 1),
                  d = x0 - data[i - 1].date > data[i].date - x0 ? data[i] : data[i - 1];
                  focus.attr("transform", "translate(" + x(d.date) +  "," + y(d.price) + ")");
                  text.text(fr.timeFormat('%A %e %B %Y')(d.date) + ' – ' + fr.numberFormat(",.2f")(d.price) + " €");
          });

    });


    function brushed() {
      x.domain(brush.empty() ? x2.domain() : brush.extent());
      graph.select(".area").attr("d", area);
      graph.select(".line").attr("d", area);
      graph.select(".x.axis").call(xAxis);
    }

  }

  var $ = this;
  $.init();

}


