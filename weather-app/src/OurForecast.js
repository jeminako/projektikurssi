import React, { useState, useEffect, useRef } from 'react';
import './App.css';
// import getData from './Home'
import getWindAndRainData from './Home'
import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';

import Metolib from '@fmidev/metolib';
import Sources from './Sources';
import Home from './Home.js';



function OurForecast() {

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

    //Hooks
    const [maxTemperatures, setMaxTemperatures] = useState([]);
    const [inputCity, setInputCity] = useState("");
    const [inputDate, setInputDate] = useState("");
    const [warning, setWarning] = useState("");
    const [windData, setWindData] = useState([]);
    const [windAndRainTimeData, setWindAndRainTimeData] = useState([]);
    const [rainData, setRainData] = useState([]);
    const [forecast, setForecast] = useState([]);
    const [maxForecast, setMaxForecast] = useState([]);
    const [windForecast, setWindForecast] = useState([]);
    const [rainForecast, setRainForecast] = useState([]);
    const svgRef = useRef();
    const svgRefRain = useRef();
    const svgRefForecast = useRef();
    const svgRefRainForecast = useRef();


    //Haetaan annettujen parametrien mukainen lämpötiladata ilmatieteenlaitoksen latauspalvelusta
    function getData() {
        var SERVER_URL = "http://opendata.fmi.fi/wfs";
        var STORED_QUERY_OBSERVATION = "fmi::observations::weather::multipointcoverage";
        var parser = new Metolib.WfsRequestParser();

        let pvm = inputDateToDate(inputDate);
        let uusiEnd = new Date(pvm.getTime() + 604800000);
        parser.getData({
            url: SERVER_URL,
            storedQueryId: STORED_QUERY_OBSERVATION,
            requestParameter: "temperature",
            begin: pvm,
            end: uusiEnd,
            timestep: 60 * 60 * 1000,
            sites: inputCity,
            callback: function (data, errors) {
                handleData(data, errors);
            }
        });
    }

    //Etsitään ennustusten oikeasta päivästä data
    function parseForecast(dateData, type) {
        let dataAr = [];
        let dataindex = -1;
        if (type === "temperature") dataindex = 1;
        if (type === "wind") dataindex = 2;
        if (type === "rain") dataindex = 3;
        for (let i = 0; i < dateData.length; i++) {
            if (dateData[i][0] === inputCity) {
                let weatherData = dateData[i][dataindex];
                weatherData = weatherData.trim();
                dataAr = weatherData.split(/[\s]+/);
            }
        }
        return dataAr;
    }


    function forecastMaxWeather(pvmHelper) {
        let dateParts = inputDate.split('/').map(Number);
        let dateString = dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
        let dateId = forecast[dateString].id;
        let keys = Object.keys(forecast);
        let maxAr = [];
        let index = 0;
        let dataType = "temperature";
        for (let i = dateId; i < dateId + 7; i++) {
            let data = [];
            for (let j = 0; j < keys.length; j++) {
                let key = keys[j];
                if (forecast[key].id === i) {
                    let dateData = forecast[key].data;
                    data = parseForecast(dateData, dataType);
                    break;
                }
            }
            let max = -1000;
            for (let k = 0; k < 24; k++) {
                if (parseFloat(data[k]) > max) {
                    max = parseFloat(data[k]);
                }
            }
            maxAr.push([pvmHelper[index], max]);
            index++;
        }
        setMaxForecast(maxAr);
        console.log(maxForecast);
    }

    //Käsitellään ja asetetaan haettu lämpötiladata. Jos virheitä, näytetään varoitusviesti.
    function handleData(data, errors) {
        //console.log(data);
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
            let pvmHelper = [];

            for (const pari of tempDay) {
                apuMaximi.push(pari);
                if (i === 24) {
                    for (const pari2 of apuMaximi) {
                        lampotila = pari2[1];
                        if (suurin < lampotila) suurin = lampotila;
                    }
                    suurinPari = [pari[0], suurin]
                    pvmHelper.push(pari[0]);
                    tempWeekMax.push(suurinPari);
                    apuMaximi = [];
                    i = 1;
                    suurin = -1000;
                }
                i++;
            }
            setMaxTemperatures(tempWeekMax);
            forecastMaxWeather(pvmHelper);
        } else {
            //Toiminnot, jos datassa virheitä
            console.log("Error");
            setMaxTemperatures([]);
            setWarning("Tarkista hakuehdot!");
            return;
        }
    }

    function laskeDelta() {

    }

    // // Haetaan vanhat ennusteet
    // useEffect(() => {
    //     fetch('/api').then(response => {
    //         if (response.ok) {
    //             return response.json()
    //         } else {
    //             console.log('Virhe JSON-datan haussa.')
    //         }
    //     }).then(data => setForecast(data))
    // }, [])

    //Asetetaan valittu kaupunki
    const onSelect = (event) => {
        console.log(event.value);
        setInputCity(event.value);
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
        laskeDelta();
        //getWindAndRainData();
    }

    var mc = {
        '0-19': 'red',
        '20-59': 'orange',
        '60-100': 'green'
    };

    function between(x, min, max) {
        return x >= min && x <= max;
    }

    const element = React.createElement(
        'h1',
        { className: 'greeting' },
        'Hello, world!'
    );

    /** Muuttaa date-inputista saatavan jonon (YYYY-MM-DD) Dateksi
    * @param {String} inputValue Inputti muodossa YYYY-MM-DD
    */
    function inputDateToDate(inputValue) {
        let dateParts = inputValue.split('-').map(Number);
        return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0);
    }

    return (
        <div className='App'>
            <Dropdown className="dropDown" options={options} onChange={onSelect} value={inputCity} placeholder="Valitse kaupunki" />
            <input className="date" type='date' value={inputDate} onChange={handleInputDate} placeholder="pp/kk/vvvv" />
            <br />
            <button onClick={handleClick}>Hae tiedot</button>

            <div className="weatherData">
                <h2>Ennusteet</h2>
                <div className="weatherBar">
                    {maxTemperatures.map((item, index) => (

                        <div key={index + "div"} className="temp">
                            <header key={index + "time"} className="time">{item[0]}</header>
                            <div key={index + "t"} className="t">{item[1]}</div>
                        </div>
                    ))}
                </div>

                <h2>Delta</h2>

                <div className="lampotilaDelta">
                    {maxTemperatures.map((item, index) => (

                        <div key={index + "div"} className="temp">
                            <header key={index + "time"} className="time">{item[0]}</header>
                            <div style={{ color: 'green' }} key={index + "t"} className="t">{'±' + (item[1] - item[1]).toString()}</div>

                        </div>
                    ))}
                </div>

                <h2>Toteutuneet max lämpötilat</h2>
                <div className="weatherBar">
                    {maxTemperatures.map((item, index) => (

                    <div key={index + "div"} className="temp">
                        <header key={index + "time"} className="time">{item[0]}</header>
                        <div key={index + "t"} className="t">{item[1]}</div>
                    </div>
                ))}

                </div>

            </div>
            <h1>Our Forecast (demo)</h1>
            <p>Eli tänne voi tehdä sen sivun, jossa käyttäjä voi hakea ennusteen tiettyyn kaupunkiin,
            ja tuloksissa näytetään ennuste ja ennuste keskivirheen kanssa.</p>
        </div>
    );
}

export default OurForecast;