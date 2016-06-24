/*
  Affichage des cours avec D3
  Sylvain Durand – MIT license
*/

"use strict";


function stocks(div) {


  // Initialisation du graphique
  // ---------------------------

  this.init = function() {

    // Données à afficher sur le graphique

      $.curves = ["ewma12", "ewma26", "price"];


    // Modèles de boîtes

      $.width   = 760;
      $.height  = 350;
      $.top     =  15;
      $.bottom  =  40;
      $.left    =  35;
      $.right   =  20;
      $.padding = 100;


    // Définition des échelles

      $.x  = d3.time.scale().range([0, $.width]);
      $.x_axis = d3.svg.axis().scale($.x)
          .orient("bottom").tickFormat(fr_axis);


    // Création de l'espace de travail

      $.svg = d3.select(div)
          .append("svg")
          .attr("class", "plot")
          .attr("width", $.width + $.left + $.right )
          .attr("height", $.height + $.top + $.bottom)

      $.svg.append("defs").append("clipPath")
          .attr("id", "clip")
          .append("rect")
          .attr("width", $.width)
          .attr("height", $.top + $.height + $.bottom);

      $.plot = $.svg.append("g")
          .attr("class", "wrap")
          .attr("transform", "translate(" + $.left + "," + $.top + ")");


    // Créations des courbes

      for (var c in $.curves) {
        $.plot.append("path")
            .attr("class", $.curves[c])
            .style("clip-path", " url(#clip)");
      }

      $.plot.append("path")
          .attr("class", "bollinger")
          .style("clip-path", " url(#clip)")


    // Créations des axes

      $.plot.append("g")
          .attr("class", "y axis");

      $.plot.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + $.height + ")");

  }



  // Calcul de l'ensemble d'arrivée
  // ------------------------------

  this.compute_domain = function(key, ext) {

      function val(d, value) {
        return (d.date >= ext[0] && d.date <= ext[1]) ? d[key] : value;
      }


    // Calcul sur l'ensemble des valeurs

      if (ext === undefined) {
        var min = d3.min($.data.map(function(d) { return d[key] })),
            max = d3.max($.data.map(function(d) { return d[key] }));
      }


    // Calcul sur une plage donnée

      else {
        var dom = $.compute_domain(key),
            min = d3.min($.data.map(function(d) { return val(d, dom[1]) })),
            max = d3.max($.data.map(function(d) { return val(d, dom[0]) })),
            min = (4 * min + dom[0])/5,
            max = (4 * max + dom[1])/5;
      }


    // Retour de l'ensemble avec une marge

      var Δ = (max-min) * 0.05;
      return [min - Δ, max + Δ];
  }



  // Calcul des pourcentages
  // -----------------------

  this.compute_ratio = function(base) {
    $.data.forEach(function(d) {
        for (var stat in d) {
          if (stat != 'date' && stat.indexOf("ratio_") < 0 ) {
            d['ratio_' + stat] = d[stat] / base;
          }
        }
      });
  }



  // Lecture des données
  // -------------------

  this.read = function(err, data) {
      data.forEach(function(d) {
          d.date = d3.time.format('%Y-%m-%d').parse(d.date);
          for (var stat in d) {
            if (stat != 'date') {
              d[stat] = +d[stat];
            }
          }
        });

      $.data = data;
      $.draw();
      $.macd();
      $.zoom();
      $.show();
  }



  // Affichage du graphique
  // ----------------------

  this.draw = function() {

    // Calcul des données

      if ($.type == "relative") {
        $.compute_ratio($.data[0].price);
      }

      $.pre = ($.type == "relative") ? "ratio_" : "";

    // Calcul des intervalles

      $.x.domain(d3.extent($.data.map(function(d) { return d.date })));

      $.y  = d3.scale.linear().range([$.height, 0]);
      $.y.domain($.compute_domain("price"));
      $.y_axis = d3.svg.axis().scale($.y).orient("left").tickSize(-$.width, 0);

      if ($.type == "relative") {
        var percent = function(x) { return d3.format("+.0%")(x - 1); };

        $.y  = d3.scale.log().range([$.height, 0]);
        $.y_axis = d3.svg.axis()
            .scale($.y)
            .orient("left")
            .tickSize(-$.width, 0)
            .tickFormat(percent);
        $.y.domain($.compute_domain("ratio_price"));
        $.y_axis.tickValues(d3.scale.linear().domain($.y.domain()).ticks(8));

      }


    // Affichages des axes

      $.plot.select(".x.axis")
          .call($.x_axis);

      $.plot.select(".y.axis")
          .call($.y_axis)
          .selectAll(".tick")
          .classed("tick-one", function(d) { return Math.abs(d-1) < 1e-6; });


    // Calcul des courbes

      function draw(curve) {
        $[curve] = d3.svg.line()
          .x(function(d) { return $.x(d.date) })
          .y(function(d) { return $.y(d[$.pre + curve]) });

        $.plot.select("."+curve)
          .datum($.data).transition().duration(1000)
          .attr("d", $[curve]);
      }

      for (var c in $.curves) {
        draw($.curves[c]);
      }

      $.bollinger = d3.svg.area()
          .x(function(d) { return $.x(d.date) })
          .y1(function(d) { return $.y(d[$.pre + "bollinger_upper"]) })
          .y0(function(d) { return $.y(d[$.pre + "bollinger_lower"]) });

      $.plot.select(".bollinger")
          .datum($.data).transition().duration(1000)
          .attr("d", $.bollinger);
  }



  // Affichage du MACD
  // -----------------

  this.macd = function() {

    // Définition de la zone de travail

      $.svg.attr("height", + $.svg.attr("height") + $.padding)

      var macd = $.plot.append("g")
          .attr("transform", "translate(0," +
                                  ($.top + $.height + $.bottom ) + ")");


    // Définition des courbes

      macd.append("rect")
          .attr("class", "positif")
          .attr("width", $.width)
          .attr("height", $.padding)
          .attr("clip-path", "url(#positif)");

      macd.append("rect")
          .attr("class", "negatif")
          .attr("width", $.width)
          .attr("height", $.padding)
          .attr("clip-path", "url(#negatif)");

      macd.append("path")
          .attr("class", "macd")
          .style("clip-path", " url(#clip)");

      macd.append("path")
          .attr("class", 'signal')
          .style("clip-path", " url(#clip)");


    // Définition des axes

      $.y_macd = d3.scale.linear().range([$.padding, 0]);
      $.y_macd.domain($.compute_domain("macd"));

      $.y_macd_axis = d3.svg.axis()
          .scale($.y_macd)
          .orient("left")
          .tickSize(-$.width, 0).ticks(4);

      macd.append("g")
          .attr("class", "y axis")
          .call($.y_macd_axis);


    // Affichage des courbes

      $.macd = d3.svg.line()
        .x(function(d) { return $.x(d.date) })
        .y(function(d) { return $.y_macd(d.macd) });

      $.signal = d3.svg.line()
        .x(function(d) { return $.x(d.date) })
        .y(function(d) { return $.y_macd(d.signal) });

      $.div = d3.svg.area()
          .x(function(d) { return $.x(d.date) })
          .y0($.y_macd(0));

      macd.datum($.data)
          .append("clipPath")
          .attr("id", "positif")
          .append("path")
          .attr("d", $.div.y1(function(d) {
            return Math.min($.y_macd(0), $.y_macd(1.5 * d.div)) }));

      macd.datum($.data)
          .append("clipPath")
          .attr("id", "negatif")
          .append("path")
          .attr("d", $.div.y1(function(d) {
            return Math.max($.y_macd(0), $.y_macd(1.5 * d.div)) }));

      macd.select("path.macd").attr("d", $.macd);
      macd.select("path.signal").attr("d", $.signal);

  }



  // Affichage du sélecteur
  // ----------------------

  this.zoom = function() {

    // Définition de la zone de travail

      var zoom = d3.select(div)
          .append("svg")
          .attr("class", "zoom")
          .attr("width",  ($.width + $.left + $.right ))
          .attr("height", ($.top + $.padding + $.bottom))
          .append("g")
          .attr("transform", "translate(" + $.left + ",0)");


    // Définition des échelles

      $.x_map = d3.time.scale().range([0, $.width]);
      $.y_map = d3.scale.linear().range([$.padding, 0]);


    // Définition des courbes

      zoom.append("path")
          .attr("class", "area")
          .style("clip-path", " url(#clip)")


    // Calcul des axes

      $.x_map.domain($.x.domain());
      $.y_map.domain($.y.domain());

    // Définition du sélecteur

      $.map = d3.svg.area()
          .interpolate("monotone")
          .x(function(d) { return $.x_map(d.date) })
          .y1(function(d) { return $.y_map(d.price) })
          .y0($.padding);

      $.brush = d3.svg.brush()
          .x($.x_map);

      zoom.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + $.padding + ")")
          .call($.x_axis);

      zoom.append("g")
          .attr("class", "x brush")
          .call($.brush)
          .selectAll("rect")
          .attr("height", $.padding );


      zoom.select(".area")
          .datum($.data)
          .attr("d", $.map);


    // Zoom sur la sélection


      $.brush.on("brush", function () {
          var ext = $.brush.extent();

          if ($.type == "relative") {

            var basedate = d3.min($.data.map(function(d)
                                    {if (d.date >= ext[0]) return d.date})),
                basevalue = $.data.find(function (d)
                                      {return d.date == basedate; }).price;

            $.compute_ratio(basevalue);

          }

          if (!$.brush.empty()) {
              $.x.domain($.brush.empty() ? $.x_map.domain() : $.brush.extent());
              $.y.domain($.compute_domain($.pre + "price", ext));
          }

          else {
            $.x.domain(d3.extent($.data.map(function(d) { return d.date })));
            $.y.domain($.compute_domain($.pre + "price"));
          }

          if ($.type == "relative") {
            $.y_axis.tickValues(d3.scale.linear()
                .domain($.y.domain())
                .ticks(8));
          }

          for (var c in $.curves) {
            $.plot.select("."+$.curves[c]).attr("d", $[$.curves[c]]);
          }

          $.plot.select(".area").attr("d", $.price);
          $.plot.select(".bollinger").attr("d", $.bollinger);
          $.plot.select(".x.axis").call($.x_axis);
          $.plot.select(".y.axis").call($.y_axis);

          d3.select("#positif path")
              .attr("d", $.div.y1(function(d) {
                return Math.min($.y_macd(0), $.y_macd(1.5 * d.div)) }));

          d3.select("#negatif path")
              .attr("d", $.div.y1(function(d) {
                return Math.max($.y_macd(0), $.y_macd(1.5 * d.div)) }));

          d3.select(".macd").attr("d", $.macd);
          d3.select(".signal").attr("d", $.signal);

          $.div = d3.svg.area()
              .x(function(d) { return $.x(d.date) })
              .y0($.y_macd(0));

      });

  }



  // Affichage du curseur et des données
  // -----------------------------------

  this.show = function() {

    // Création de la ligne

      $.focus = $.plot.append("g")
          .attr("class", "focus")
          .style("display", "none");

      $.focus.append("line")
          .attr("y1", 10)
          .attr("y2", 10 * $.height);


    // Création des textes

      var lgd_date = d3.select(div)
          .insert("div",".stocks")
          .attr("class", "lgd_date");

      var lgd_plot = d3.select(div)
          .insert("div",".stocks")
          .attr("class", "lgd_plot")
          .style("left", $.left + "px");

      lgd_plot.append("span").attr("class", "lgd").text("Fermeture : ");

      var lgd_price = lgd_plot.append("span")
          .attr("class", "val lgd_price");

      lgd_plot.append("span").attr("class", "lgd").text("EWMA12 : ");

      var lgd_ewma12 = lgd_plot.append("span")
          .attr("class", "val lgd_ewma12");

      lgd_plot.append("span").attr("class", "lgd").text("EWMA26 : ");

      var lgd_ewma26 = lgd_plot.append("span")
          .attr("class", "val lgd_ewma26");

      lgd_plot.append("span").attr("class", "lgd").text("Bollinger : ");

      var lgd_bollinger = lgd_plot.append("span")
          .attr("class", "val lgd_bollinger");

      var lgd_macd = d3.select(div)
          .insert("div",".stocks")
          .attr("class", "lgd_macd")
          .style("left", $.left + "px")
          .style("top", $.top + $.height + $.bottom + "px");

      lgd_macd.append("span").attr("class", "lgd").text("MACD : ")

      var lgd_macd2 = lgd_macd.append("span")
          .attr("class", "val lgd_macd2");

      lgd_macd.append("span").attr("class", "lgd").text("Signal : ")

      var lgd_signal = lgd_macd.append("span")
          .attr("class", "val lgd_div");

      lgd_macd.append("span").attr("class", "lgd").text("Divergence : ")

      var lgd_div = lgd_macd.append("span")
          .attr("class", "val lgd_div");

      default_price();


    // Affichage des valeurs dynamiquement

      $.plot.append("rect")
          .attr("class", "overlay")
          .attr("width", $.width)
          .attr("height", 10 * $.height)
          .on("mousemove", show_price)
          .on("mouseout", default_price)
          .on("mouseover", function() { $.focus.style("display", null) });

      function show_price() {
          var x0 = $.x.invert(d3.mouse(this)[0]),
              i = d3.bisector(function(d){return d.date}).left($.data, x0, 1),
              d0 = $.data[i - 1],
              d1 = (!$.data[i] ? $.data[i- 1] : $.data[i]),
              d = x0 - d0.date > d1.date - x0 ? d1 : d0;

          $.focus.attr("transform", "translate("+$.x(d.date)+",0)");
          lgd_date.text(fr_time(d.date));
          lgd_price.text(fr_digit(d.price));
          lgd_ewma12.text(fr_digit(d.ewma12));
          lgd_ewma26.text(fr_digit(d.ewma26));
          lgd_bollinger.text(fr_digit(d.bollinger_upper)
              + ' – ' + fr_digit(d.bollinger_lower));
          lgd_macd2.text(fr_digit(d.macd));
          lgd_signal.text(fr_digit(d.signal));
          lgd_div.text(fr_digit(d.div));
          lgd_div.attr("class", (d.div >= 0) ? "plus" : "minus");

      }

      function default_price() {
          var last = $.data.slice(-1)[0]

          $.focus.style("display", "none");
          lgd_date.text(fr_time(last.date));
          lgd_price.text(fr_digit(last.price));
          lgd_ewma12.text(fr_digit(last.ewma12));
          lgd_ewma26.text(fr_digit(last.ewma26));
          lgd_bollinger.text(fr_digit(last.bollinger_upper)
              + ' – ' + fr_digit(last.bollinger_lower));
          lgd_macd2.text(fr_digit(last.macd));
          lgd_signal.text(fr_digit(last.signal));
          lgd_div.text(fr_digit(last.div));
          lgd_div.attr("class", (last.div >= 0) ? "plus" : "minus");
      }

  }

  var $ = this;
  $.init();

}
