import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import handleData from './Home'
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

    

    // Haetaan vanhat ennusteet
    useEffect(() => {
        fetch('/api').then(response => {
            if (response.ok) {
                return response.json()
            }
        }).then(data => setForecast(data))
    }, [])

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



    return (
        <div className='App'>
            <Dropdown className="dropDown" options={options} onChange={onSelect} value={inputCity} placeholder="Valitse kaupunki" />
            <input className="date" value={inputDate} onChange={handleInputDate} placeholder="pp/kk/vvvv" />
            <h1>Our Forecast (demo)</h1>
            <p>Eli tänne voi tehdä sen sivun, jossa käyttäjä voi hakea ennusteen tiettyyn kaupunkiin,
            ja tuloksissa näytetään ennuste ja ennuste keskivirheen kanssa.</p>
        </div>
    );
}

export default OurForecast;