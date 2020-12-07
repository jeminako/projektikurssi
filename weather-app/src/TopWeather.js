import React, { useState } from 'react';
import './App.css';
import Metolib from '@fmidev/metolib';
import Sources from './Sources';

function TopWeather() {
    const [inputDate, setInputDate] = useState("");
    const [maxTemp, setMaxTemp] = useState(0);
    const [minTemp, setMinTemp] = useState(0);
    const [maxPlace, setMaxPlace] = useState("");
    const [minPlace, setMinPlace] = useState("");
    const [maxWind, setMaxWind] = useState(0);
    const [windPlace, setWindPlace] = useState("");
    const [maxRain, setMaxRain] = useState(0);
    const [rainPlace, setRainPlace] = useState("");
    const [warning, setWarning] = useState("");

    //Haetaan tietylle päivälle kaikkien kaupunkien data
    function getData() {
        console.log(inputDate);
        var SERVER_URL = "http://opendata.fmi.fi/wfs";
        var STORED_QUERY_OBSERVATION = "fmi::observations::weather::cities::multipointcoverage";
        var parser = new Metolib.WfsRequestParser();
        if (inputDate === "") {
            setWarning("Tarkista hakuehdot!");
            return;
        }
        let dateParts = inputDate.split('-').map(Number);
        let start = new Date(dateParts[0], dateParts[1]-1, dateParts[2], 0, 0, 0);
        let end = new Date(dateParts[0], dateParts[1]-1, dateParts[2], 23, 0, 0);
        parser.getData({
            url : SERVER_URL,
            storedQueryId: STORED_QUERY_OBSERVATION,
            requestParameter : "t2m,ws_10min,r_1h",
            begin : start,
            end : end,
            timestep : 60 * 60 * 1000,
            sites : "*",
            callback : function(data, errors) {
                handleData(data, errors);
            }
        });
    }

    //Käsitellään ja asetetaan haettu tuuli/sade data. Jos virheitä, näytetään varoitusviesti.
    function handleData(data, errors) {
        if (errors.length === 0) {
            console.log(data);
            findMaxAndMinTemp(data);
            findMaxWind(data);
            findMaxRain(data);
        } else {
            console.log("Error");
        return;
        }
    }

    function findMaxRain(data) {
        let maxRainAmount = 0;
        let maxCity = "";
        for (let i = 0; i<75; i++) {
            let hours = data.locations[i].data.r_1h.timeValuePairs;
            let city = data.locations[i].info.region;
            let rainAmount = 0;
            for (const hour of hours) {
                if (isNaN(hour.value)) {
                    continue;
                }
                rainAmount += hour.value;
            }
            if (rainAmount > maxRainAmount) {
                maxRainAmount = rainAmount;
                maxCity = city;
            }
        }
        setRainPlace(maxCity);
        setMaxRain(Math.round(maxRainAmount * 10) / 10);
    }

    function findMaxWind(data) {
        let maxWindSpeed = 0;
        let maxCity = "";
        for (let i = 0; i<75; i++) {
            let hours = data.locations[i].data.ws_10min.timeValuePairs;
            let city = data.locations[i].info.region;
            for (const hour of hours) {
                if (isNaN(hour.value)) {
                    continue;
                }
                if (hour.value > maxWindSpeed) {
                    maxWindSpeed = hour.value;
                    maxCity = city;
                }
            }
        }
        setWindPlace(maxCity);
        setMaxWind(maxWindSpeed);
    }

    function findMaxAndMinTemp(data) {
        let maxTemp = Number.MIN_VALUE;
        let minTemp = Number.MAX_VALUE;
        let maxPlace = "";
        let minPlace = "";
        for (let i = 0;  i<75; i++) {
            let hours = data.locations[i].data.t2m.timeValuePairs;
            let city = data.locations[i].info.region;
            for (const hour of hours) {
                if (hour.value > maxTemp) {
                    maxTemp = hour.value;
                    maxPlace = city;
                }
                if (hour.value < minTemp) {
                    minTemp = hour.value;
                    minPlace = city;
                }
            }
        }
        setMaxTemp(maxTemp);
        setMinTemp(minTemp);
        setMaxPlace(maxPlace)
        setMinPlace(minPlace);
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
    }

    return (
        <div className='App'>
            <h1>Päivän kohokohdat</h1>
            <input value={inputDate} type="date" onChange={handleInputDate} placeholder="pp/kk/vvvv" />
            <button onClick={handleClick}>Hae tiedot</button>
            <h3>{warning}</h3>
            <div id='dayTop'>
                <div className='topinfo'>
                    <div>
                        <div className='maxmintemp'>
                            <div className='imgdiv'>
                                <img src='images/hot.png' alt='hot'/>
                            </div>
                            <div>
                                <div className='maxmint'>{maxTemp}°C</div>
                                <header className='topcity'>{maxPlace}</header>
                            </div>
                        </div>
                        <div className='maxmintemp'>
                            <div className='imgdiv'>
                                <img src='images/windy.png' alt='wind'/>
                            </div>
                            <div>
                                <div className='maxmint'>{maxWind}m/s</div>
                                <header className='topcity'>{windPlace}</header>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className='maxmintemp'>
                            <div className='imgdiv'>
                                <img src='images/cold.png' alt='cold'/>
                            </div>
                            <div>
                                <div className='maxmint'>{minTemp}°C</div>
                                <header className='topcity'>{minPlace}</header>
                            </div>
                        </div>
                        <div className='maxmintemp'>
                            <div className='imgdiv'>
                                <img src='images/rainy.png' alt='rain'/>
                            </div>
                            <div>
                                <div className='maxmint'>{maxRain}mm</div>
                                <header className='topcity'>{rainPlace}</header>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Sources />
        </div>
    );
}

export default TopWeather;