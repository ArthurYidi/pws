/*
 * Public Water Systems
 * Arthur Yidi
 */

"use strict";

var width = 1280,
    height = 800;

var projection = d3.geo.albersUsa()
    .scale(1200)
    .translate([470, 400]);

var projectPath = d3.geo.path()
    .projection(projection);

var svg = d3.select("#viz").append("svg")
    .attr("class", "Blues") //colorbrewer colors
    .attr("width", width)
    .attr("height", height);

svg.append("rect")
    .attr("id", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", clicked);

// shadow effect
var shadow = svg.append("defs")
    .append("filter")
        .attr("id", "shadow")
        .attr("height", "180%")
        .attr("width", "180%");

shadow.append("feGaussianBlur")
    .attr("stdDeviation", "0.8");

shadow.append("feOffset")
    .attr("dx", "0.5").attr("dy", "0.5")
    .attr("result", "offsetblur");

var fmerge = shadow.append("feMerge");
    fmerge.append("feMergeNode");
    fmerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

var usa = svg.append("g");

var counties = usa.append("g")
    .attr("id", "counties");

var states = usa.append("g")
    .attr("id", "states");

var topLayer = usa.append("g");

// slider range
var minRange = 0;
var maxRange = 250;
var valuesRange = [0, 55];

// map color range
var pad = d3.format("05d"),
    quantize = d3.scale.quantile().domain(valuesRange).range(d3.range(8));

var PWS;
var stateFIPS;
var activeCounty = {
    fips: 0,
    state: 0,
    dom: false,
    selected: false
};

////////////////////////////////////////////////////////////////////////////////
// GENERATE MAP
////////////////////////////////////////////////////////////////////////////////

/**
 * D3 map Generation
 *
 * @param data
 * @returns {undefined}
 */
d3.json("data/pws.json", function(data) {
    PWS = data;

    // load FIPS to state
    d3.json("data/state-fips.json", function(dataFIPS) {
        stateFIPS = dataFIPS;
    });

    // load usa counties
    d3.json("data/us-counties.json", function(error, countiesMap) {
        counties
            .selectAll("path")
            .data(countiesMap.features)
            .enter().append("path")
            .attr("d", projectPath)
            .on("click", clicked)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);

            updateCounties();

        // load usa states
        d3.json("data/us-states.json", function(error, statesMap) {
            states
                .selectAll("path")
                .data(statesMap.features)
                .enter().append("path")
                .attr("d", projectPath);
        });
    });
});

$("#sidebar").hide();

////////////////////////////////////////////////////////////////////////////////
// SLIDER
////////////////////////////////////////////////////////////////////////////////

var rangeSlider = $("#slider").slider({
    range: true,
    step: 1,
    slide: updateQuantile,
    stop: updateQuantile
});

$(rangeSlider).slider("option", "min", minRange);
$(rangeSlider).slider("option", "max", maxRange);
$(rangeSlider).slider("option", "values", valuesRange);

var leftTooltip = $("#left"),
    rightTooltip = $("#right"),
    leftHandle = $(slider).children('.ui-slider-handle').first(),
    rightHandle = $(slider).children('.ui-slider-handle').last();

updateSliderTooltips(null, { values : valuesRange });

/**
 * updateQuantile
 *
 * Update the range used for coloring the map
 *
 * @param e
 * @param slider
 * @returns {undefined}
 */
function updateQuantile(e, slider) {
    quantize = d3.scale.quantile().domain(slider.values).range(d3.range(8));
    updateCounties();
    updateSliderTooltips(e, slider);
}

/**
 * updateSliderTooltips
 *
 * Provide a label over the slider buttons
 *
 * @param e
 * @param slider
 * @returns {undefined}
 */
function updateSliderTooltips(e, slider) {
    var posL = leftHandle.position();
    var posR = rightHandle.position();
    leftTooltip.css('left', 20 + posL.left).text(slider.values[0]);
    rightTooltip.css('left', 10 + posR.left).text(slider.values[1] + " +");
}

////////////////////////////////////////////////////////////////////////////////
// MAP UPDATES
////////////////////////////////////////////////////////////////////////////////

/**
 * displayInfo
 *
 * Display PWS county information in the sidebar and generate a list of PWS.
 *
 * @param d
 * @param zoom {boolean}
 * @returns {undefined}
 */
function displayInfo(d, zoom) {
    if (!zoom) {
        $("#sidebar").hide();
        return;
    }

    $("#sidebar").show();

    var pws = PWS[pad(d.id)];

    $("#location").html(pws.LOCATION + ', <br>' + stateFIPS[stateNum(d.id)]);
    $("#size").text(formatNum(pws.TOTAL_SIZE));

    var watersources = "";
    var countypws = pws.PWS.sort(sortBySize);

    countypws.forEach(function(d,i) {
        watersources += "<li>" + toTitleCase(d.NAME);
        watersources += " (" + formatNum(d.SIZE) + ")"
        watersources += "</li>";
    });

    $("#pws ul").html(watersources);
    $("#pws").scrollTop(0);

    createChart(pad(d.id));
}

/**
 * updateCounties
 *
 * Update the color of counties to reflect new range.
 *
 * @returns {undefined}
 */
function updateCounties() {

    // set class according the range and colorbrew color
    function setCountyClass(d, preClass) {
        var pws = PWS[pad(d.id)];
        if (pws) {
            var v = quantize(pws.TOTAL_VIOLATIONS / pws.NUM_PWS);
            return preClass + " q" + v + "-9";
        }

        return "no-pws";
    }

    counties.selectAll("path").attr("class", function(d) {
        return setCountyClass(d, "");
    });

    topLayer.selectAll("path").attr("class", function(d) {
        return setCountyClass(d, "active");
    });
}

////////////////////////////////////////////////////////////////////////////////
// Mouse Events
////////////////////////////////////////////////////////////////////////////////

/**
 * zoomIn
 *
 * @param d
 * @param node
 * @returns {undefined}
 */
function zoomIn(d, node) {
    var centroid = projectPath.centroid(d);
    var x = centroid[0] + 40,
        y = centroid[1],
        k = 4;

    //move previous active to counties
    if (activeCounty.selected || activeCounty.dom) {
        counties.node().appendChild(activeCounty.dom);
        d3.select(activeCounty.dom).classed("active", false);
    }

    //move to top layer
    topLayer.node().appendChild(node);

    activeCounty.state = stateNum(d.id);

    counties.selectAll("path").filter(function(d,i) {
        return stateNum(d.id) !== activeCounty.state;
    }).attr("opacity", 0.05);

    activeCounty.dom = node;
    activeCounty.fips = pad(d.id);
    activeCounty.selected = true;

    states.selectAll("path").classed("selected", true);
    d3.select(node).classed("active", true);
    moveMap(x, y, k);
    displayInfo(d, true);
}

/**
 * zoomOut
 *
 * @param d
 * @returns {undefined}
 */
function zoomOut(d) {
    var x = width / 2,
        y = height / 2,
        k = 1;

    if (activeCounty.selected) {
        counties.node().appendChild(activeCounty.dom);
        d3.select(activeCounty.dom).classed("active", false);
    }

    states.selectAll("path").classed("selected", false);
    counties.selectAll("path").attr("opacity", 1);
    activeCounty.selected = false;
    moveMap(x, y, k);
    displayInfo(d, false);
}

/**
 * moveMap
 *
 * Move and scale map with animation
 *
 * @param x
 * @param y
 * @param k (scale)
 * @returns {undefined}
 */
function moveMap(x, y, k) {
    usa.transition()
        .duration(750)
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")" +
              "scale(" + k + ")" +
              "translate(" + -x + "," + -y + ")");
}

/**
 * clicked
 *
 * @param d
 * @returns {undefined}
 */
function clicked(d) {
    if (d) {
        if (!activeCounty.selected) {
            zoomIn(d, this);
            return;
        }

        if (stateNum(d.id) === activeCounty.state) {
            zoomIn(d, this);
            return;
        }
    }

    zoomOut();
}

/**
 * mouseout
 *
 * @param d
 * @returns {undefined}
 */
function mouseout(d) {
    resetTopLayer();
    d3.select(this).classed("mouseover", false);
}

/**
 * resetTopLayer
 *
 * Move paths from toplayer back to counties.
 *
 * The toplayer is used as a z-index to make sure strokes and shadows are shown
 * correctly.
 *
 * @returns {undefined}
 */
function resetTopLayer() {
    topLayer.selectAll("path").each(function (d, i) {
        if (pad(d.id) !== activeCounty.fips)
            counties.node().appendChild(this);
    });
}


/**
 * mouseoverEffect
 *
 * @param node
 * @returns {undefined}
 */
function mouseoverEffect(node) {
    topLayer.node().appendChild(node);
    d3.select(node).classed("mouseover", true);
}

/**
 * mouseover
 *
 * Red hover effect for counties
 *
 * @param d
 * @returns {undefined}
 */
function mouseover(d) {
    resetTopLayer();

    if (!activeCounty.selected) {
        mouseoverEffect(this);
        return;
    }

    // only mouse over on current state and ignore the active county
    if ((stateNum(d.id) === activeCounty.state) &&
        (pad(d.id) !== activeCounty.fips) ) {
        mouseoverEffect(this);
    }
}

////////////////////////////////////////////////////////////////////////////////
// CHART SVG
////////////////////////////////////////////////////////////////////////////////

var margin = {top: 20, right: 10, bottom: 30, left: 30},
    cWidthSVG = 400,
    cHeightSVG = 360,
    cWidth = cWidthSVG - margin.left - margin.right,
    cHeight = cHeightSVG - margin.top - margin.bottom;

var chartSvg =  d3.select("#chart").append("svg")
    .attr("width", cWidthSVG)
    .attr("height", cHeightSVG)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var chartX = d3.scale.ordinal()
    .rangeBands([0, cWidth], 0.1, 0.3);

var chartY = d3.scale.linear()
    .range([cHeight, 0]);

var xAxis = d3.svg.axis()
    .scale(chartX)
    .orient("bottom");

chartSvg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + cHeight + ")")
    .call(xAxis);

var yAxis = d3.svg.axis()
    .scale(chartY)
    .orient("left")
    .tickFormat(d3.format("0"));

var chartYsvg = chartSvg.append("g")
    .attr("class", "y axis");

chartYsvg
    .append("text")
        .attr("y", -10)
        .attr("x", margin.left + 30)
        .style("text-anchor", "end")
        .text("Violations");

var chartXsvg = chartSvg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + cHeight + ")");

/**
 * createChart
 *
 * @param id
 * @returns {undefined}
 */
function createChart(id) {
    var data = PWS[id];

    var pwsNames = data.PWS.map(function (e, i) {
        return e.NAME;
    });

    var chartMax = d3.max(data.PWS, function(d) {
        return d.VIOLATIONS_COUNT;
    });

    chartX.domain(pwsNames);
    chartY.domain([0, chartMax]).nice();
    chartYsvg.call(yAxis);

    // reset chart
    chartSvg.selectAll("rect").remove();

    var rect = chartSvg.selectAll("rect").data(data.PWS);

    rect.enter().append("rect")
        .attr("class", "bar")
        .attr("width", chartX.rangeBand())
        .attr("x", function(d) { return chartX(d.NAME); })
        .attr("y", function(d) { return chartY(d.VIOLATIONS_COUNT); })
        .attr("height", function(d) { return cHeight - chartY(d.VIOLATIONS_COUNT); });

    // remove extra rects
    rect.exit().remove();
}

////////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

/**
 * formatNum
 *
 * Add commas to a number
 *
 * @param num
 * @returns {string}
 */
function formatNum(num) {
    return num.toLocaleString('en-US', {maximumFractionDigits: 0});
}

/**
 * stateNum
 *
 * FIPS state number
 *
 * @param id
 * @returns {string}
 */
function stateNum(id) {
    return pad(id).substring(0,2);
}

/**
 * toTitleCase
 *
 * Quick formatting for PWS titles
 *
 * @param str
 * @returns {string}
 */
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
        if (txt === "OF")
            return "of";
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * sortBySize
 *
 * @param a
 * @param b
 * @returns {number}
 */
function sortBySize(a, b) {
    var aSize = a.SIZE,
        bSize = b.SIZE;
    return ((aSize > bSize) ? -1 : ((aSize < bSize) ? 1 : 0));
}
