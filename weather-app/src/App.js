import React, { useState } from 'react';
import './App.css';
import Metolib from '@fmidev/metolib'

function App () {

  //Hooks
  const [temperatures, setTemperatures] = useState([]);
  const [input, setInput] = useState({city: "", date: ""});
  const [warning, setWarning] = useState("");

  //Haetaan annettujen parametrien mukainen data ilmatieteenlaitoksen latauspalvelusta
  function getData() {
    var SERVER_URL = "http://opendata.fmi.fi/wfs";
    var STORED_QUERY_OBSERVATION = "fmi::observations::weather::multipointcoverage";
    var parser = new Metolib.WfsRequestParser();
    let dateParts = input.date.split('/').map(Number);
    parser.getData({
    url : SERVER_URL,
    storedQueryId: STORED_QUERY_OBSERVATION,
    requestParameter : "temperature",
    begin : new Date(dateParts[2], dateParts[1]-1, dateParts[0], 0, 0, 0),
    end : new Date(dateParts[2], dateParts[1]-1, dateParts[0], 23, 0, 0),
    timestep : 60 * 60 * 1000 * 3,
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
        var timeString = timeMs.toTimeString().substring(0, 5);
        tempDay.push([timeString, pair.value]);
      }
      setTemperatures(tempDay);
      setWarning("");
    } else {
      console.log("Error");
      setTemperatures([]);
      setWarning("Tarkista hakuehdot!");
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
          {temperatures.map((item, index) => (
            <div key={index + "div"} className="temp">
              <header key={index + "time"} className="time">{item[0]}</header>
              <div key={index + "t"} className="t">{item[1]}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="weatherData">
        <header>FORECAST</header>
        <div className="weatherBar">
          {temperatures.map((item, index) => (
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
