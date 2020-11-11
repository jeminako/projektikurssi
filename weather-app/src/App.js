import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Metolib from '@fmidev/metolib';
import * as d3 from 'd3';
import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';

function App () {

  //Hooks
  const [temperatures, setTemperatures] = useState([]);
  const [maxTemperatures, setMaxTemperatures] = useState([]);
  const [inputCity, setInputCity] = useState("");
  const [inputDate, setInputDate] = useState("");
  const [warning, setWarning] = useState("");
  const [windData, setWindData] = useState([]);
  const [windTimeData, setWindTimeData] = useState([]);
  const svgRef = useRef();

  const options = [
    'Helsinki',
    'Hämeenlinna',
    'Joensuu',
    'Jyväskylä',
    'Kajaani',
    'Kokkola',
    'Kotka',
    'Kuopio',
    'Lahti',
    'Lappeenranta',
    'Maarianhamina',
    'Mikkeli',
    'Oulu',
    'Pori',
    'Rovaniemi',
    'Seinäjoki',
    'Tampere',
    'Turku',
    'Vaasa'
  ];

  //Efekti, jota käytetään tuulen nopeuden grafiikan näyttämiseen
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    console.log(windData);
    let maxValue = Math.ceil(Math.max(...windData)) + 2;

    //X-akselin skaalaus
    const xScale = d3.scaleLinear()
      .domain([0, windData.length-1])
      .range([0,300]);

    //Y-akselin skaalaus
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
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
      .y(yScale);
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
    let dateParts = inputDate.split('/').map(Number);
    let pvm = new Date(dateParts[2], dateParts[1]-1, dateParts[0], 0, 0, 0);
    let uusiEnd = new Date(pvm.getTime() + 604800000);
    parser.getData({
    url : SERVER_URL,
    storedQueryId: STORED_QUERY_OBSERVATION,
    requestParameter : "temperature",
    begin : pvm,
    end : uusiEnd,
    timestep : 60 * 60 * 1000,
    sites : inputCity,
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
        tempDay.push([dateString, pair.value]);
      }
      setTemperatures(tempDay);
      setWarning("");
      

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
          tempWeekMax.push(suurinPari);
          apuMaximi = [];
          i = 1;
          suurin = -1000;
        }
        i++;
      }
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
    let dateParts = inputDate.split('/').map(Number);
    let pvm = new Date(dateParts[2], dateParts[1]-1, dateParts[0], 0, 0, 0);
    let uusiEnd = new Date(pvm.getTime() + 604800000);
    parser.getData({
    url : SERVER_URL,
    storedQueryId: STORED_QUERY_OBSERVATION,
    requestParameter : "ws_10min",
    begin : pvm,
    end : uusiEnd,
    timestep : 60 * 60 * 1000,
    sites : inputCity,
    callback : function(data, errors) {
      handleWindData(data, errors);
    }
   });
  }

  //Käsitellään ja asetetaan haettu data. Jos virheitä, näytetään varoitusviesti.
  function handleWindData(data, errors) {
    if (errors.length === 0) {
      let windAr = [];
      let allTimes = [];
      let windTimes = [];
      console.log(data);
      for (const pair of data.locations[0].data.ws_10min.timeValuePairs) {
        var timeMs = new Date(pair.time);
        var dateString = timeMs.getDate() + "." + (timeMs.getMonth() + 1) + ".";
        allTimes.push(dateString);
        windAr.push(pair.value);
      }
      let maxAr = [];
      let j = 0;
      let limit = 24;
      for (let i = 0; i<7; i++) {
        let max = -1;
        for (j; j<limit; j++) {
          if (windAr[j] > max) {
            max = windAr[j];
          }
        }
        windTimes.push(allTimes[j-1]);
        maxAr.push(max);
        limit += 24;
      }
      console.log(maxAr);
      setWindData(maxAr);
      setWindTimeData(windTimes);
    } else {
      console.log("Error");
      setWindData([]);
      setWindTimeData([]);
      return;
    }
  }

  //Funktio input-palkkien tekstinsyötön käsittelyyn
  function handleInputDate(event) {
    event.preventDefault();
    const value = event.target.value;
    setInputDate(value);
  }

  //Käsitellään hakunapin painallus
  const handleClick = (event) => {
    event.preventDefault();
    getData();
    getWindData();
  }

  const onSelect = (event) => {
    console.log(event.value);
    setInputCity(event.value);
  }

  return (
    <div className="App">
      <h1>Sää</h1>
      <Dropdown className="dropDown" options={options} onChange={onSelect} value={inputCity} placeholder="Valitse kaupunki"/>
      <input className="date" value={inputDate} onChange={handleInputDate} placeholder="pp/kk/vvvv" />
      <br/> 
      <button onClick={handleClick}>Hae tiedot</button>
      <h3>{warning}</h3>
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
      <div className="sources">
        <header>Lähteet:</header>
        <p>Kaikki sovelluksen data on saatu Ilmatieteen laitoksen toimittamista <a href="https://www.ilmatieteenlaitos.fi/avoin-data">tietoaineistoista.</a> Data on lisensioitu © <a href="https://creativecommons.org/licenses/by/4.0/deed.fi">CC BY 4.0-lisenssillä.</a></p>
      </div>
    </div>
  );
}

export default App;
