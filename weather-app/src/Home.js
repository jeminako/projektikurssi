import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Metolib from '@fmidev/metolib';
import * as d3 from 'd3';
import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';
import Sources from './Sources';

function Home() {

  //Hooks
  const [maxTemperatures, setMaxTemperatures] = useState([]);
  const [inputCity, setInputCity] = useState("");
  const [inputDate, setInputDate] = useState("");
  const [warning, setWarning] = useState("");
  const [windData, setWindData] = useState([]);
  const [windAndRainTimeData, setWindAndRainTimeData] = useState([]);
  const [rainData, setRainData] = useState([]);
  const svgRef = useRef();
  const svgRefRain = useRef();
  const svgRefForecast = useRef();
  const svgRefRainForecast = useRef();

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
      .tickFormat(index => windAndRainTimeData[index]);
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
  }, [windData, windAndRainTimeData]);

  //Efekti, jota käytetään sademäärän grafiikan näyttämiseen
  useEffect(() => {
    const svg = d3.select(svgRefRain.current);
    let maxValue = Math.ceil(Math.max(...rainData)) + 0.5;

    //X-akselin skaalaus
    const xScale = d3.scaleBand()
      .domain(rainData.map((value, index) => index))
      .range([0,300])
      .padding(0.5);

    //Y-akselin skaalaus
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([150, 0]);

    //X-akseli
    const xAxis = d3.axisBottom(xScale)
      .ticks(rainData.length)
      .tickFormat(index => windAndRainTimeData[index]);
    svg.select(".x-axis")
      .style("transform", "translateY(150px)")
      .call(xAxis);

    //Y-akseli
    const yAxis = d3.axisRight(yScale)
      .tickFormat(value => value + " mm");
    svg.select(".y-axis")
      .style("transform", "translateX(300px)")
      .call(yAxis);

    //Palkit
    svg.selectAll(".bar")
      .data(rainData)
      .join("rect")
      .attr("class", "bar")
      .attr("fill", "royalblue")
      .style("transform", "scale(1, -1)")
      .attr("x", (value, index) => xScale(index))
      .attr("y", -150)
      .attr("width", xScale.bandwidth())
      .transition()
      .attr("height", value => 150 - yScale(value));
  }, [rainData, windAndRainTimeData]);

  //Haetaan annettujen parametrien mukainen lämpötiladata ilmatieteenlaitoksen latauspalvelusta
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

  //Käsitellään ja asetetaan haettu lämpötiladata. Jos virheitä, näytetään varoitusviesti.
  function handleData(data, errors) {
    console.log(data);
    let tempDay = [];
    if (errors.length === 0) {
      for (const pair of data.locations[0].data.temperature.timeValuePairs) {
        var timeMs = new Date(pair.time);
        var dateString = timeMs.getDate() + "." + (timeMs.getMonth() + 1) + "." + timeMs.getFullYear();
        tempDay.push([dateString, pair.value]);
      }
      setWarning("");
      
      //Viikon maksimien etsiminen
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
      //Toiminnot, jos datassa virheitä
      console.log("Error");
      setMaxTemperatures([]);
      setWarning("Tarkista hakuehdot!");
      return;
    }
  }

  //Haetaan annettujen parametrien mukainen tuuli- ja sadedata ilmatieteenlaitoksen latauspalvelusta
  function getWindAndRainData() {
    var SERVER_URL = "http://opendata.fmi.fi/wfs";
    var STORED_QUERY_OBSERVATION = "fmi::observations::weather::multipointcoverage";
    var parser = new Metolib.WfsRequestParser();
    let dateParts = inputDate.split('/').map(Number);
    let pvm = new Date(dateParts[2], dateParts[1]-1, dateParts[0], 0, 0, 0);
    let uusiEnd = new Date(pvm.getTime() + 604800000);
    parser.getData({
      url : SERVER_URL,
      storedQueryId: STORED_QUERY_OBSERVATION,
      requestParameter : "ws_10min,r_1h",
      begin : pvm,
      end : uusiEnd,
      timestep : 60 * 60 * 1000,
      sites : inputCity,
      callback : function(data, errors) {
        handleWindAndRainData(data, errors);
      }
   });
  }

  //Käsitellään ja asetetaan haettu tuuli/sade data. Jos virheitä, näytetään varoitusviesti.
  function handleWindAndRainData(data, errors) {
    console.log(data);
    if (errors.length === 0) {
      let windAr = [];
      let rainAr = [];
      let allTimes = [];
      for (const pair of data.locations[0].data.ws_10min.timeValuePairs) {
        var timeMs = new Date(pair.time);
        var dateString = timeMs.getDate() + "." + (timeMs.getMonth() + 1) + ".";
        allTimes.push(dateString);
        windAr.push(pair.value);
      }
      for (const pair of data.locations[0].data.r_1h.timeValuePairs) {
        rainAr.push(pair.value);
      }

      //Etsitään viikon maksimit tuulennopeuksille
      let maxAr = [];
      let maxTimes = [];
      windMax(windAr, allTimes, maxAr, maxTimes);
      console.log(maxAr);
      setWindData(maxAr);
      setWindAndRainTimeData(maxTimes);
      
      //Etsitään sademäärät päiville
      let rainAmount = [];
      dailyRainAmount(rainAmount, rainAr);
      console.log(rainAmount);
      setRainData(rainAmount);
    } else {
      console.log("Error");
      setWindData([]);
      setRainData([]);
      setWindAndRainTimeData([]);
      return;
    }
  }

  //Laskee viikolle päivän sademäärän
  function dailyRainAmount(rainAmount, rainAr) {
    let j = 0;
    let limit = 24;
    for (let i = 0; i<7; i++) {
      let amount = 0;
      for (j; j<limit; j++) {
        let rain = rainAr[j];
        if (isNaN(rain)) {
          rain = 0;
        }
        amount += rain;
      }
      rainAmount.push(amount);
      limit += 24;
    }
  }

  //Funktio tuulennopeuden viikon maksimien etsimiseen
  function windMax(elementAr, allTimes, maxAr, maxTimes) {
    let j = 0;
    let limit = 24;
    for (let i = 0; i<7; i++) {
      let max = 0;
      for (j; j<limit; j++) {
        if (elementAr[j] > max) {
          max = elementAr[j];
        }
      }
      maxTimes.push(allTimes[j-1]);
      maxAr.push(max);
      limit += 24;
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
    getWindAndRainData();
  }

  //Asetetaan valittu kaupunki
  const onSelect = (event) => {
    console.log(event.value);
    setInputCity(event.value);
  }

  return (
    <div className="App">
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
        <div className="visualizations">
          <div>
            <svg ref={svgRef}>
              <g className="x-axis" />
              <g className="y-axis" />
            </svg>
            <p>Tuulennopeuksien maksimit</p>
          </div>
          <div>
            <svg ref={svgRefRain}>
              <g className="x-axis" />
              <g className="y-axis" />
            </svg>
            <p>Päivittäiset sademäärät</p>
          </div>
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
        <div className="visualizations">
          <div>
            <svg ref={svgRefForecast}>
              <g className="x-axis" />
              <g className="y-axis" />
            </svg>
            <p>Ennustus</p>
          </div>
          <div>
            <svg ref={svgRefRainForecast}>
              <g className="x-axis" />
              <g className="y-axis" />
            </svg>
            <p>Ennustus</p>
          </div>
        </div>
      </div>
      <Sources />
    </div>
  );
}

export default Home;
