import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Metolib from '@fmidev/metolib'
import  { WeatherReal } from './WeatherReal';

//

function App () {
  const [temperatures, setTemperatures] = useState([]);
  const [times, setTimes] = useState([]);
  let tempDay = [];

  function getData() {
    var SERVER_URL = "http://opendata.fmi.fi/wfs";
    var STORED_QUERY_OBSERVATION = "fmi::observations::weather::multipointcoverage";
    var parser = new Metolib.WfsRequestParser();

    parser.getData({
    url : SERVER_URL,
    storedQueryId: STORED_QUERY_OBSERVATION,
    requestParameter : "temperature",
    begin : new Date(2020, 9, 20, 0, 0, 0),
    end : new Date(2020, 9, 21, 0, 0, 0),
    timestep : 60 * 60 * 1000,
    sites : "Jyväskylä",
    callback : function(data, errors) {
      handleData(data, errors);
    }
   });
}

function handleData(data, errors) {
  console.log(data);
  if (errors.length === 0) {
    for (const pair of data.locations[0].data.temperature.timeValuePairs) {
      var timeMs = new Date(pair.time);
      var timeString = timeMs.toTimeString().substring(0, 5);
      tempDay.push([timeString, pair.value]);
    }
    setTemperatures(tempDay);
  } else {
    console.log("Error");
    return;
  }
}

  const handleClick = (event) => {
    event.preventDefault();
    getData();
  }

  return (
    <div className="App">
      <h1>Sää</h1>
      <button onClick={handleClick}>Hae tiedot</button>
      <div id="city">Jyväskylä</div>
      <div id="date">12/10/2020</div>
      <div className="current">
        <header>WEATHER</header>
        <div className="weatherBar">
        {temperatures.map((item, index) => (
          <div className="temp">
            <header className="time">{item[0]}</header>
            <div className="t">{item[1]}</div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

export default App;
