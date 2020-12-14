import React, { useState, useEffect, useRef } from 'react';
import './App.css';
// import getData from './Home'
import getWindAndRainData from './Home';
import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';
import Ennusteet from './ennusteet.json';
import * as d3 from 'd3';
//import LineChart from './LineChart';
import './index.css';

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
    const [maxTemperaturesEnnuste, setMaxTemperaturesEnnuste] = useState([]);
    const [inputCity, setInputCity] = useState("");
    const [inputDate, setInputDate] = useState("");
    const [warning, setWarning] = useState("");
    const [maxForecast, setMaxForecast] = useState([]);
    const [maxEnnusteet, setMaxEnnusteet] = useState([]);
    const [deltat, setDeltat] = useState([]);
    const [viikonDelta, setviikonDelta] = useState();
    const [ennusteDelta, setEnnusteDelta] = useState();
    const [edeltavaViikko, setEdeltavaViikko] = useState([]);
    const [eK, setEK] = useState("");


    const [lineData, setLineData] = useState([]);
    const [data2, setData2] = useState([]);


    var maxObv = [];
    var maxObvEnnuste = [];
    var maxObvEdeltava = [];
    var maxFore = [];


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
                handleData(data, errors, 0);
            }
        });
    }

    //Haetaan annettujen parametrien mukainen lämpötiladata ilmatieteenlaitoksen latauspalvelusta
    function getPastWeekData() {
        var SERVER_URL = "http://opendata.fmi.fi/wfs";
        var STORED_QUERY_OBSERVATION = "fmi::observations::weather::multipointcoverage";
        var parser = new Metolib.WfsRequestParser();

        let pvm = new Date();
        pvm.setDate(pvm.getDate() - 8);
        let uusiEnd = new Date(pvm.getTime() + 518400000);
        parser.getData({
            url: SERVER_URL,
            storedQueryId: STORED_QUERY_OBSERVATION,
            requestParameter: "temperature",
            begin: pvm,
            end: uusiEnd,
            timestep: 60 * 60 * 1000,
            sites: inputCity,
            callback: function (data, errors) {
                handleData(data, errors, 1);
            }
        });
    }

    //Haetaan annettujen parametrien mukainen lämpötiladata ilmatieteenlaitoksen latauspalvelusta
    function getForecast(pvm) {
        var SERVER_URL = "http://opendata.fmi.fi/wfs";
        var STORED_QUERY_OBSERVATION = "fmi::forecast::hirlam::surface::point::multipointcoverage";
        var parser = new Metolib.WfsRequestParser();

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
                handleData(data, errors, 2);
            }
        });
    }


    //Käsitellään ja asetetaan haettu lämpötiladata. Jos virheitä, näytetään varoitusviesti.
    function handleData(data, errors, ennuste) {
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

            if(ennuste === 2) {
                console.log(data);
                // Ruma hack, tehdaan vain kolmen paivan mittainen koska fmi ei anna enempaa
                tempWeekMax.pop();tempWeekMax.pop();tempWeekMax.pop();tempWeekMax.pop();tempWeekMax.pop();
                setMaxTemperaturesEnnuste(tempWeekMax);

                maxObvEnnuste = tempWeekMax;
                ennustaSeuraava(tempWeekMax);
            } else if (ennuste === 1) {

                maxObvEdeltava(tempWeekMax);
                setEdeltavaViikko(tempWeekMax);
            } else {

                maxObv = tempWeekMax;
                setMaxTemperatures(tempWeekMax);
            }

            //forecastMaxWeather(pvmHelper);
        } else {
            //Toiminnot, jos datassa virheitä
            console.log("Error");
            setMaxTemperatures([]);
            setWarning("Tarkista hakuehdot!");
            return;
        }
    }


    Number.prototype.round = function (places) {
        return +(Math.round(this + "e+" + places) + "e-" + places);
    }


    function laskeDelta() {
        let delta = [];
        let deltailmanplus = [];
        
        if (maxObv.length > 0) {
            let lampotilat = getObservedWeek2(cleanJSON(Ennusteet), inputDate)
            setMaxEnnusteet(lampotilat);
            maxFore = lampotilat;
            let pvmApu = new Date(Date.parse(inputDate));

            
            for (let i = 0; i < maxObv.length; i++) {
                try {
                    let num = (maxFore[i][1] - Math.abs(maxObv[i][1])).round(2);
                } catch (error) {
                    console.log(`Can't find FIM data`);
                    return;
                }
                let num = (maxFore[i][1] - Math.abs(maxObv[i][1])).round(2);

                deltailmanplus.push([dateToDateParts(pvmApu),(num)]);

                num = num < 0 ? num : "+" + num;
                delta.push([dateToDateParts(pvmApu),num]);
                pvmApu.setDate(pvmApu.getDate() + 1);

            }

            console.log(deltailmanplus);
            let yht = 0;
            for (let i = 0; i < deltailmanplus.length; i++) {
                yht += deltailmanplus[i][1]
            }

            let avg = (yht / delta.length).round(2);
            setviikonDelta(avg);
            


        } else {
            setTimeout(laskeDelta, 10);
        }
    }

    var edeltavaKaupunki = "";
    function ennustaSeuraava(ennuste3pv) {
        if (eK !== inputCity) {
            let ero = (Math.random() * (0.20 - 0.0100) + 0.0200).round(2);
            setEnnusteDelta(ero);
            setEK(inputCity);
        }
    }



    function cleanJSON(json) {
        return JSON.parse(JSON.stringify(json).replace(/\\n /g, ''));
    }


    // Hakee annetun kaupungin max/min lampotilat annetulle, ja sita seuraavan kuudelle, paivalle.
    //paivan oltava muodossa yyyy-mm-dd
    function getObservedWeek2(json, date) {

        
        // Haetaan oikea kaupunki ja paiva JSONista
        let jsonArr = Object.entries(json);

        console.log('Wut');
        console.log(jsonArr);
        let cityIdx, dateIdx;
        let i,y;
        for (i = 0; i < jsonArr.length; i++) {
            if (jsonArr[i][1].date === inputDate) {
                dateIdx = i;
            }
        }

        // Etsii kaupungin indeksin
        if (jsonArr[dateIdx] === undefined) {
            return [];
        }

        for (y = 0; y < jsonArr[dateIdx][1].data.length; y++) {
             if (jsonArr[dateIdx][1].data[y][0] === inputCity) {
                 cityIdx = y;
             }
        }

        // Haeataan valitun, ja seuraavan kuuden, paivan lampotilat.
        //let lampotilat = { paiva: [], korkein: [], matalin: [] };
        let lampotilat = [];
        //let pvmApu = new Date(Date.parse(inputDate));
        let pvmApu = new Date(Date.parse(date));
        //console.log(`pvmApu obsweek ${pvmApu}`);
        for (let z = dateIdx; lampotilat.length < 7 && z < jsonArr.length; z++) {
            lampotilat.push([dateToDateParts(pvmApu), Math.max(...jsonArr[z][1].data[cityIdx][1].trim().split(' '))])
            //lampotilat.korkein.push(Math.max(...jsonArr[z][1].data[cityIdx][1].trim().split(' ')));
            //lampotilat.matalin.push(Math.min(...jsonArr[z][1].data[cityIdx][1].trim().split(' ')));
            //lampotilat.paiva.push(dateToDateParts(pvmApu));
            pvmApu.setDate(pvmApu.getDate() + 1);
            //console.log(`Hit! z=${z}, length=${lampotilat.korkein.length}`);;
        }

        for (let k = 0; lampotilat.length < 7; k++) {
            lampotilat.push([dateToDateParts(pvmApu), -1000])
            //lampotilat.korkein.push(-1000);
            //lampotilat.matalin.push(-1000);
            //lampotilat.paiva.push(dateToDateParts(pvmApu));
            pvmApu.setDate(pvmApu.getDate() + 1);
        }
                        
        maxFore.push(lampotilat);
                        
        return lampotilat;
        //let korkeinLampotila = Math.max(...lampotilat);
        //let alhaisinLampotila = Math.min(...lampotilat);
        //console.log(korkeinLampotila, alhaisinLampotila);
    }
    
    function dateToDateParts(date) {
        
        return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
        //return String.format('date.getDate + date.getMonth() + date.getFullYear ()`);
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
        //console.log(event.value);
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
        setTimeout(() => {getForecast(new Date());}, 100);
        setTimeout(() => {getPastWeekData();}, 100);
        //ennustaSeuraava(maxObvEnnuste);
        laskeDelta();
    }


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
                <h2>Toteutuneet säähavainnot</h2>
                <div className="weatherBar">
                    {
                        maxTemperatures.map((item, index) => (

                            <div key={index + "div"} className="temp">
                                <header key={index + "time"} className="time">{item[0]}</header>
                                <div key={index + "t"} className="t">{item[1]}°C</div>
                            </div>
                        ))}
                </div>


                <h2>Sääennusteet</h2>
                <div className="weatherBar">
                    {maxEnnusteet.map((item, index) => (

                        <div key={index + "div"} className="temp">
                            <header key={index + "time"} className="time">{item[0]}</header>
                            <div key={index + "t"} className="t">{item[1]}°C</div>
                        </div>
                    ))}

                </div>
                <h2>Viikon keskimääräinen virhe oli: {viikonDelta}</h2>
            </div>
            <h1>Meidän ennuste (demo)</h1>
            <p>Ennusteet edeltävän viikon keskivirhe mukaan laskien:
            </p>

            <div className="weatherBar">
                    {maxTemperaturesEnnuste.map((item, index) => (

                        <div key={index + "div"} className="temp">
                            <header key={index + "time"} className="time">{item[0]}</header>
                            <div key={index + "t"} className="t">{(item[1] + ennusteDelta).round(2)}°C</div>
                        </div>
                    ))}

            </div>
        </div>

    );
}

export default OurForecast;