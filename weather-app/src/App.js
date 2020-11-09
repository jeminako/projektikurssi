import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Metolib from '@fmidev/metolib';
import * as d3 from 'd3';

function App () {

  //Hooks
  const [temperatures, setTemperatures] = useState([]);
  const [maxTemperatures, setMaxTemperatures] = useState([]);
  const [input, setInput] = useState({city: "", date: ""});
  const [warning, setWarning] = useState("");
  const [windData, setWindData] = useState([]);
  const [windTimeData, setWindTimeData] = useState([]);
  const svgRef = useRef();

  //Efekti, jota käytetään tuulen nopeuden grafiikan näyttämiseen
  useEffect(() => {
    const svg = d3.select(svgRef.current);

    //X-akselin skaalaus
    const xScale = d3.scaleLinear()
      .domain([0, windData.length-1])
      .range([0,300]);

    //Y-akselin skaalaus
    const yScale = d3.scaleLinear()
      .domain([0, 10])
      .range([150, 0]);

    //X-akseli
    const xAxis = d3.axisBottom(xScale)
      .ticks(windData.length)
      .tickFormat(index => windTimeData[index]);
    svg.select(".x-axis")
      .style("transform", "translateY(150px)")
      .call(xAxis);
    //Y-akseli
    const yAxis = d3.axisRight(yScale)
      .tickFormat(value => value + " m/s");
    svg.select(".y-axis")
      .style("transform", "translateX(300px)")
      .call(yAxis);
    //Viiva
    const windLine = d3.line()
      .x((value, index) => xScale(index))
      .y(yScale)
      .curve(d3.curveCardinal);
    svg
      .selectAll(".line")
      .data([windData])
      .join("path")
      .attr("class", "line")
      .attr("d", windLine)
      .attr("fill", "none")
      .attr("stroke", "blue");
  }, [windData, windTimeData]);

  //Haetaan annettujen parametrien mukainen data ilmatieteenlaitoksen latauspalvelusta
  function getData() {
    var SERVER_URL = "http://opendata.fmi.fi/wfs";
    var STORED_QUERY_OBSERVATION = "fmi::observations::weather::multipointcoverage";
    var parser = new Metolib.WfsRequestParser();
    let dateParts = input.date.split('/').map(Number);
    let pvm = new Date(dateParts[2], dateParts[1]-1, dateParts[0], 0, 0, 0);
    let uusiEnd = new Date(pvm.getTime() + 604800000);
    parser.getData({
    url : SERVER_URL,
    storedQueryId: STORED_QUERY_OBSERVATION,
    requestParameter : "temperature",
    begin : pvm,
    end : uusiEnd,
    timestep : 60 * 60 * 1000,
    sites : input.city,
    callback : function(data, errors) {
      handleData(data, errors);
    }
   });
  }

  //Käsitellään ja asetetaan haettu data. Jos virheitä, näytetään varoitusviesti.
  function handleData(data, errors) {
    console.log(data);
    let tempDay = [];
    if (errors.length === 0) {
      for (const pair of data.locations[0].data.temperature.timeValuePairs) {
        var timeMs = new Date(pair.time);
        var dateString = timeMs.getDate() + "." + (timeMs.getMonth() + 1) + "." + timeMs.getFullYear();
        //var timeString = timeMs.toTimeString();
        tempDay.push([dateString, pair.value]);
      }
      setTemperatures(tempDay);
      setWarning("");
      getWindData();

      let lampotila;
      let suurin = -1000;

      let tempWeekMax = [];
      let apuMaximi = [];
      let suurinPari;
      var i = 1;

      for (const pari of tempDay) {
        apuMaximi.push(pari);
        if (i === 24) {
          for (const pari2 of apuMaximi) {
            lampotila = pari2[1];
            if (suurin < lampotila) suurin = lampotila;
          }
          suurinPari = [pari[0], suurin]
          console.log(suurinPari)
          tempWeekMax.push(suurinPari);
          apuMaximi = [];
          i = 1;
          suurin = -1000;
        }
        i++;
      }
      console.log(tempWeekMax);
      setMaxTemperatures(tempWeekMax);
    } else {
      console.log("Error");
      setTemperatures([]);
      setWarning("Tarkista hakuehdot!");
      return;
    }
  }

  //Haetaan annettujen parametrien mukainen tuulidata ilmatieteenlaitoksen latauspalvelusta
  function getWindData() {
    var SERVER_URL = "http://opendata.fmi.fi/wfs";
    var STORED_QUERY_OBSERVATION = "fmi::observations::weather::multipointcoverage";
    var parser = new Metolib.WfsRequestParser();
    let dateParts = input.date.split('/').map(Number);
    parser.getData({
    url : SERVER_URL,
    storedQueryId: STORED_QUERY_OBSERVATION,
    requestParameter : "ws_10min",
    begin : new Date(dateParts[2], dateParts[1]-1, dateParts[0], 0, 0, 0),
    end : new Date(dateParts[2], dateParts[1]-1, dateParts[0], 23, 0, 0),
    timestep : 60 * 60 * 1000 * 3,
    sites : input.city,
    callback : function(data, errors) {
      handleWindData(data, errors);
    }
   });
  }

  //Käsitellään ja asetetaan haettu data. Jos virheitä, näytetään varoitusviesti.
  function handleWindData(data, errors) {
    if (errors.length === 0) {
      let windAr = [];
      let windTimeAr = [];
      for (const pair of data.locations[0].data.ws_10min.timeValuePairs) {
        var timeMs = new Date(pair.time);
        var timeString = timeMs.toTimeString().substring(0, 5);
        windTimeAr.push([timeString]);
        windAr.push([pair.value]);
      }
      setWindData(windAr);
      setWindTimeData(windTimeAr);
    } else {
      console.log("Error");
      setWindData([]);
      setWindTimeData([]);
      return;
    }
  }

  //Funktio input-palkkien tekstinsyötön käsittelyyn
  function handleInput(event) {
    event.preventDefault();
    const value = event.target.value;
    setInput({
      ...input,
      [event.target.name]: value
    });
  }

  //Käsitellään hakunapin painallus
  const handleClick = (event) => {
    event.preventDefault();
    getData();
  }

  return (
    <div className="App">
      <h1>Sää</h1>
      <button onClick={handleClick}>Hae tiedot</button>
      <input name="city" value={input.city} onChange={handleInput} placeholder="kaupunki" />
      <input name="date" value={input.date} onChange={handleInput} placeholder="pp/kk/vvvv" />
      <h3>{warning}</h3>
      <div id="city">{input.city}</div>
      <div id="date">{input.date}</div>
      <div className="weatherData">
        <header>WEATHER</header>
        <div className="weatherBar">
          {maxTemperatures.map((item, index) => (
            <div key={index + "div"} className="temp">
              <header key={index + "time"} className="time">{item[0]}</header>
              <div key={index + "t"} className="t">{item[1]}</div>
            </div>
          ))}
        </div>
        <div>
          <svg ref={svgRef}>
            <g className="x-axis" />
            <g className="y-axis" />
          </svg>
        </div>
      </div>
      <div className="weatherData">
        <header>FORECAST</header>
        <div className="weatherBar">
          {maxTemperatures.map((item, index) => (
              <div key={index + "div"} className="temp">
                <header key={index + "time"} className="time">{item[0]}</header>
                <div key={index + "t"} className="t">{item[1]}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default App;
