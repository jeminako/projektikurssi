import React, { useState } from 'react';
import './Map.css';
import './App.css';
import { Map as LeafletMap, Marker, Popup, TileLayer } from "react-leaflet";
import Sources from './Sources';
import Metolib from '@fmidev/metolib';

//#region FUNCS
//Tässä yleisempiä funktioita sään haulle. Nämä voisi siirtää omaan tiedostoon, voi käyttää ihan hyvin Home.js:stäkin tätä

/** Yleiskäyttöinen haku metoLibistä
 * @param {String[]} reqParams Mitä säätyyppejä haetaan?
 * @param {Date} startDate Aloitus PVM Datena
 * @param {Number} hours Montako tuntia haetaan aloitusajasta
 * @param {String} location Sijainnin nimi
 * @param {Function} onSuccess kutsuttava funktio kun haku palautuu. Muodossa function(data={}, errors=[])
 * @param {Boolean} forecast True jos halutaan ennuste. Default false
 */
function getWeatherData(reqParams, startDate, hours, location, onSuccess, forecast = false) {
    let reqParam = reqParams.join(",");
    var SERVER_URL = "http://opendata.fmi.fi/wfs";
    var STORED_QUERY_OBSERVATION = forecast ? "fmi::forecast::hirlam::surface::point::multipointcoverage" : "fmi::observations::weather::multipointcoverage";
    var parser = new Metolib.WfsRequestParser();
    let endDate = new Date(startDate.getTime() + 3600000 * hours);

    parser.getData({
        url: SERVER_URL,
        storedQueryId: STORED_QUERY_OBSERVATION,
        requestParameter: reqParam, //<string>(,<string>...)
        begin: startDate, //Date
        end: endDate, //Date
        timestep: 60 * 60 * 1000, //Millisekunteja
        sites: location, //<string>(,<string>...)
        callback: function (data, errors) {
            onSuccess && onSuccess(data, errors);
        }
    });
}

/** Muuttaa date-inputista saatavan jonon (YYYY-MM-DD) Dateksi
 * @param {String} inputValue Inputti muodossa YYYY-MM-DD
 */
function inputDateToDate(inputValue) {
    let dateParts = inputValue.split('-').map(Number);
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0);
}

//#endregion FUNCS

const yk = "Yleiskatsaus";

/** Yleiskatsauksen paikat koordinaatteineen. Toistaiseksi samat kuin homessa valittavat */
const paikat = [
    {
        "name": 'Helsinki',
        "coordinates": [60.1674098, 24.9425769]
    },
    {
        "name": 'Hämeenlinna',
        "coordinates": [60.9948584, 24.46654]
    },
    {
        "name": 'Joensuu',
        "coordinates": [62.6006257, 29.7584591]
    },
    {
        "name": 'Jyväskylä',
        "coordinates": [62.2393002, 25.745951]
    },
    {
        "name": 'Kajaani',
        "coordinates": [64.2240872, 27.7334227]
    },
    {
        "name": 'Kokkola',
        "coordinates": [63.8391421, 23.1336845]
    },
    {
        "name": 'Kotka',
        "coordinates": [60.4674228, 26.9450844]
    },
    {
        "name": 'Kuopio',
        "coordinates": [62.8924601, 27.6781839]
    },
    {
        "name": 'Lahti',
        "coordinates": [60.9838761, 25.6561814]
    },
    {
        "name": 'Lappeenranta',
        "coordinates": [61.0582424, 28.1875302]
    },
    {
        "name": 'Maarianhamina',
        "coordinates": [60.102423, 19.94126]
    },
    {
        "name": 'Mikkeli',
        "coordinates": [61.6877956, 27.2726569]
    },
    {
        "name": 'Oulu',
        "coordinates": [65.0118734, 25.4716809]
    },
    {
        "name": 'Pori',
        "coordinates": [61.4865542, 21.7968951]
    },
    {
        "name": 'Rovaniemi',
        "coordinates": [66.4976214, 25.7192101]
    },
    {
        "name": 'Seinäjoki',
        "coordinates": [62.7954104, 22.8442015]
    },
    {
        "name": 'Tampere',
        "coordinates": [61.4980214, 23.7603118]
    },
    {
        "name": 'Turku',
        "coordinates": [60.4517531, 22.2670522]
    },
    {
        "name": 'Vaasa',
        "coordinates": [63.0957722, 21.6159187]
    },
];

/** Palauttaa annetun jonon jos epätyhjä, muuten
 * @param {String} stringIn Mitä tutkitaan
 * @param {String} placeholder Mitä jos tyhjä
 */
function stringOr(stringIn, placeholder = "-") {
    return (stringIn && stringIn.length > 0) ? stringIn : placeholder;
}

function Map() {
    function TODAY_DATE_STRING() {
        return new Date().toJSON().slice(0, 10);
    }

    /** JKL kompassi koords :D */
    const KOMPASSI = [62.242631, 25.747356];

    /** Erilaisia tyyppjeä joita nominativin antamassa address-oliossa voi olla nimettynä */
    const PLACE_TYPES = ["village", "town", "city", "municipality", "county", "country"];

    const nameSort = "name";
    const tempSort = "temp";
    const rainSort = "rain";
    const windSort = "wind";

    const [clickPos, setClickPos] = useState(KOMPASSI);
    const [mapPos, setMapPos] = useState(KOMPASSI);
    const [inputCity, setInputCity] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("Jyväskylä");
    const [inputDate, setInputDate] = useState(TODAY_DATE_STRING());
    const [searchError, setSearchError] = useState("");
    const [allowSearch, setAllowSearch] = useState(true);

    const [temps, setTemps] = useState([]);
    const [ykTime, setYkTime] = useState(12);
    const [ykSort, setYkSort] = useState(
        {
            "type": "",
            "dir": 1
        }
    );

    const weathergetParams = [
        {
            "visName": "Lämpötila",
            "propertyName": "temp",
            "observationParam": "temperature",
            "forecastParam": "temperature"
        },
        {
            "visName": "Tuulennopeus",
            "propertyName": "wind",
            "observationParam": "ws_10min",
            "forecastParam": "windSpeedMS"
        },
        {
            "visName": "Sademäärä",
            "propertyName": "rain",
            "observationParam": "r_1h",
            "forecastParam": "precipitationAmount"
        }
    ];

    var observedData = null;
    var forecastData = null;

    /** Pyytää säätilan haun
     * @param {Event} e HTML eventti
     */
    function getWeather(e) {
        if (searchError.trim().length > 0) {
            console.log("Hakua ei suoriteta koska hakutiedoissa on virheitä");
            return;
        }

        if (searchCooldown()) {
            console.log("Liian nopeita hakuja!");
            return;
        }

        if (inputDate.trim().length < 1) {
            console.log("Invalid date!");
            return;
        }

        setYkSort({
            "type": "",
            "dir": 1
        });

        //Käytä annettua paikkaa tai valmista settiä
        let hakupaikka = (selectedLocation !== yk) ? selectedLocation : (paikat.map(function (p) {
            return p.name;
        }));

        //console.log(hakupaikka);
        let obs_hours = 24;
        let fc_hours = 0;
        let obs_start_date = inputDateToDate(inputDate);

        if (inputDate === TODAY_DATE_STRING()) {
            //Osittainen ennuste
            obs_hours = new Date().getHours() + 1;
            fc_hours = 24 - obs_hours;
        }
        else if (new Date(inputDate).getTime() > new Date().getTime()) {
            //Pelkkä ennuste
            obs_hours = 0;
            fc_hours = 24;
        }

        console.log("Observation hours: " + obs_hours);
        console.log("Forecast hours: " + fc_hours);

        //return;
        let obs_params = [];
        let fc_params = [];
        for (let p of weathergetParams) {
            p.observationParam.length > 0 && obs_params.push(p.observationParam);
            p.forecastParam.length > 0 && fc_params.push(p.forecastParam);
        }

        if (obs_hours > 0) {
            getWeatherData(
                obs_params,
                obs_start_date,
                obs_hours,
                hakupaikka,
                handleWeather
            );
        }
        else {
            observedData = [];
        }

        if (fc_hours > 0) {
            getWeatherData(
                fc_params,
                new Date(obs_start_date.getTime() + 3600000 * obs_hours),
                fc_hours,
                hakupaikka,
                handleForecast,
                true //Ennuste
            );
        }
        else {
            forecastData = [];
        }

        // getWeatherData(["temperature"], inputDateToDate(inputDate), 1, selectedLocation, handleWeather);
    }

    /** Parsii ja asettaa säädatat ennusteen hakutuloksesta
     * @param {*} data Saatu data ITLstä
     * @param {*} errors Virheviestit hausta
     */
    function handleForecast(data, errors) {
        console.log("Forecast data:");
        console.log(data);

        if (errors.length < 1) {
            if (data.locations.length < 1) {
                setSearchError("Ennustetietoja ei saatavilla tästä paikasta")
                return;
            }

            if (selectedLocation === yk) {
                /** Taulukko säädatasta */
                var newDatas = [];
                for (let i = 0; i < paikat.length; i++) {
                    newDatas.push(handleWeatherLocationData(data.locations[i].data, paikat[i].name, paikat[i].coordinates, true));
                }
                forecastData = newDatas;
                trySetDatas();
                //setTemps(newDatas);
            }
            else {
                forecastData = [handleWeatherLocationData(data.locations[0].data, selectedLocation, mapPos, true)];
                trySetDatas();
                //setTemps([handleWeatherLocationData(data.locations[0].data, selectedLocation, mapPos, true)]);
            }
        }
        else {
            for (let e of errors) {
                console.log(e);
            }
        }
    }

    /** Parsii ja asettaa säädatat hakutuloksesta
     * @param {*} data Saatu data ITLstä
     * @param {*} errors Virheviestit hausta
     */
    function handleWeather(data, errors) {
        console.log("Weatherget data:");
        console.log(data);

        if (errors.length < 1) {
            if (data.locations.length < 1) {
                setSearchError("Säätietoja ei saatavilla tästä paikasta")
                return;
            }


            if (selectedLocation === yk) {
                /** Taulukko säädatasta */
                var newDatas = [];
                for (let i = 0; i < paikat.length; i++) {
                    newDatas.push(handleWeatherLocationData(data.locations[i].data, paikat[i].name, paikat[i].coordinates));
                }
                observedData = newDatas;
                //setTemps(newDatas);
                trySetDatas();
            }
            else {
                observedData = [handleWeatherLocationData(data.locations[0].data, selectedLocation, mapPos)];
                //setTemps(observedData);
                trySetDatas();
            }

        }
        else {
            console.log(errors);
        }
    }

    /** Käsittelee datan joka saatiin säähausta kyseiselle sijannille
     * @param {*} locationData Sääpaikkadata
     * @param {String} locationName Paikan nimi
     */
    function handleWeatherLocationData(locationData, locationName = "", coords = null, isForecast = false) {
        var tempPairs = locationData.temperature.timeValuePairs;

        let data = {
            "location": locationName,
            "weatherData": [],
            "coordinates": coords
        };

        for (let i = 0; i < tempPairs.length - 1; i++) {
            let dataCell = {};
            let tp = tempPairs[i];
            let dateTime = new Date(tp.time);

            //Aseta aika
            dataCell.time = "" + dateTime.getHours();
            if (dataCell.time.length < 2) dataCell.time = "0" + dataCell.time;
            //Lämpö
            dataCell.temp = Number.isNaN(tp.value) ? "" : ("" + tp.value);

            for (let pi = 1; pi < weathergetParams.length; pi++) {
                let p = weathergetParams[pi];
                let param = isForecast ? p.forecastParam : p.observationParam;
                if (param.length > 1) {
                    let valuePair = locationData[param].timeValuePairs[i];
                    dataCell[p.propertyName] = Number.isNaN(valuePair.value) ? "" : ("" + valuePair.value);
                }
            }

            dataCell.isForecast = isForecast;

            data.weatherData.push(dataCell);
        }

        return data;
    }

    // /** Käsittelee datan joka saatiin säähausta kyseiselle sijannille
    //  * @param {*} locationData Sääpaikkadata
    //  * @param {String} locationName Paikan nimi
    //  */
    // function handleWeatherLocationData(locationData, locationName = "", coords = null, isForecast = false) {
    //     var tempPairs = locationData.temperature.timeValuePairs;
    //     console.log(isForecast ? "f1" : "o1");
    //     var rainPairs = locationData.r_1h.timeValuePairs;
    //     console.log(isForecast ? "f2" : "o2");
    //     var windPairs = locationData.ws_10min.timeValuePairs;
    //     console.log(isForecast ? "f3" : "o3");

    //     let data = {
    //         "location": locationName,
    //         "weatherData": [],
    //         "coordinates": coords
    //     };

    //     for (let i = 0; i < tempPairs.length - 1; i++) {
    //         let dataCell = {};
    //         let tp = tempPairs[i];
    //         let dateTime = new Date(tp.time);

    //         //Aseta aika
    //         dataCell.time = "" + dateTime.getHours();
    //         if (dataCell.time.length < 2) dataCell.time = "0" + dataCell.time;

    //         //Lämpötila
    //         dataCell.temp = Number.isNaN(tp.value) ? "" : ("" + tp.value);

    //         //Sade
    //         let rp = rainPairs[i];
    //         dataCell.rain = Number.isNaN(rp.value) ? "" : ("" + rp.value);

    //         //Tuuli
    //         let wp = windPairs[i];
    //         dataCell.wind = Number.isNaN(wp.value) ? "" : ("" + wp.value);

    //         data.weatherData.push(dataCell);
    //     }

    //     console.log(isForecast ? "f3" : "o3");
    //     return data;
    // }

    /** Asettaa datat, jos molemmat datat jo saaneet vastauksen. Yhdistää ennuste- ja havaintodatan */
    function trySetDatas() {
        //Odota että molemmat on valmiina
        if (observedData === null || forecastData === null) {
            return;
        }

        let fullData = Array.from(observedData);

        //Yhdistä datat
        for (let fcd of forecastData) {
            let exists = false;
            //Katso onko paikkaan jo dataa
            for (let ed of fullData) {
                if (ed.location === fcd.location && ed.coordinates === fcd.coordinates) {
                    //Löytyi, yhdistä datat olemassa olevaan
                    for (let wd of fcd.weatherData) {
                        ed.weatherData.push(wd);
                    }
                    
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                fullData.push(fcd);
            }
        }

        //Järjestä kaikki ajan mukaan
        for (let d of fullData) {
            d.weatherData.sort(function(a,b) {
                return Number.parseInt(a.time) - Number.parseInt(b.time);
            });
        }

        //Lopulta aseta yhdistetty data
        setTemps(fullData);
    }

    /** Vaihtaa valitun sijainnin ja tyhjentää säädatat
     * @param {String} newLocation Uusi sijainti
     */
    function changeLocation(newLocation) {
        if (newLocation !== selectedLocation) {
            setSelectedLocation(newLocation);
            setTemps([]);
        }
    }


    /** Hakee JSONP-objektin URLstä
     *  - Source: https://stackoverflow.com/questions/2499567/how-to-make-a-json-call-to-a-url/2499647#2499647
     * @param {Strgin} url URL jolla haetaan
     * @param {Function} success Mitä tehdään kun JSON-haku onnistui
     */
    function getJSONP(url, success) {

        var ud = '_' + +new Date();
        var script = document.createElement('script');
        var head = document.getElementsByTagName('head')[0] || document.documentElement;

        window[ud] = function (data) {
            head.removeChild(script);
            success && success(data);
        };

        script.src = url.replace('callback=?', 'callback=' + ud);
        head.appendChild(script);

    }

    /** Suorittaa tekstihaun nominativesta ja asetttaa tiedot jos haku onnistuu */
    function textSearch() {
        if (searchCooldown()) {
            console.log("Liian nopeita hakuja!");
            return;
        }

        setSearchError("");

        if (inputCity.trim().length < 1) {
            setSearchError("Ei syötettä");
            return;
        }

        //Hae paikka
        getJSONP(
            "https://nominatim.openstreetmap.org/search?countrycodes=fi&city=" + inputCity + "&limit=1&format=jsonv2&json_callback=?", //City haku, pitää olla lähes koko nimi
            //"//https://nominatim.openstreetmap.org/search?q=" + inputCity + "&countrycodes=fi&limit=1&format=jsonv2&json_callback=?", //Query haku, tuottaa välillä turhan pieniä paikkoja
            function (data) {
                console.log(data);
                //Datassa on taulukko hakua vastaavista paikoista

                if (data != null && data.length > 0) {
                    //Järjestä "tärkeyden" mukaan, laskevasti
                    data.sort(
                        function (a, b) {
                            return b.importance - a.importance;
                        }
                    );

                    //Valitse eka
                    let result = data[0];

                    //Aseta sijainti ja paikka
                    let coords = [result.lat, result.lon];
                    setClickPos(coords);
                    setMapPos(coords);
                    changeLocation(result.display_name.split(",")[0]);

                    // console.log(coords);
                    navigator.clipboard.writeText("[" + coords + "]");
                }
                else {
                    setSearchError("Ei hakutuloksia. Tarkenna/korjaa syöte");
                }
            }
        );
    }


    /** Katsoo mistä paikasta karttaa klikattiin ja hakee ja asettaa paikan tiedot
     * @param {Boolean} centerMap Keskitetäänkö kartta
     * @param {Event} e HTML eventti
     */
    function mapClick(centerMap, e) {
        if (searchCooldown()) {
            console.log("Liian nopeita hakuja!");
            return;
        }

        setClickPos([e.latlng.lat, e.latlng.lng]);
        centerMap && setMapPos([e.latlng.lat, e.latlng.lng]);

        //Hae paikka
        getJSONP(
            'https://nominatim.openstreetmap.org/reverse?lat=' + e.latlng.lat + "&lon=" + e.latlng.lng + "&zoom=10&format=jsonv2&json_callback=?",
            function (data) {

                /** Asetettava virhe */
                var error = "";
                /** Löytyikö paikalle nimi */
                var loytyi = false;

                if (data === undefined || data === null || data.address === undefined || data.address === null) {
                    //Ei validi vastaus
                    error = "Paikkatietoja ei ole saatavilla";
                }
                else {
                    let addr = data.address;

                    //Onko klik suomen alueella
                    if (data.address.country_code !== "fi") {
                        error = "Säätiedot saatavilla vain Suomessa";
                    }

                    //Etsi sopivin paikannimi osoitetiedoista
                    for (let pt of PLACE_TYPES) {
                        if (addr[pt] !== undefined) {
                            changeLocation(addr[pt]);
                            loytyi = true;
                            break;
                        }
                    }
                }

                if (!loytyi) {
                    //Aseta koords
                    let s = latLngToString(e.latlng);
                    changeLocation(s);
                    //setInputCity(s);
                }

                setSearchError(error);
            }
        );
    }

    /** Asettaa hakemisen väliaikaisesti estetyksi niin ei tule lähetettyjä liikaa kutsuja APIin
     * @returns {Boolean} True jos cooldownilla
     */
    function searchCooldown() {
        if (allowSearch) {
            setAllowSearch(false);
            setTimeout(
                () => {
                    setAllowSearch(true);
                },
                1000
            );
            return false;
        }

        return true;

        // setAllowSearch(false);
        // setTimeout(
        //     () => {
        //         setAllowSearch(true);
        //     },
        //     1000
        // );
    }

    /** Muuttaa latlng-olion merkkijonoksi 
     * @param {*} latlng LatLng-olio
     * @param {Number} decimals Montako desimaalia, default 5
     */
    function latLngToString(latlng, decimals = 5) {
        return coordsToString([latlng.lat, latlng.lng], decimals);
    }


    /** Muuttaa latlng-taulukon merkkijonoksi 
     * @param {Number[]} latlng LatLng-taulukko
     * @param {Number} decimals Montako desimaalia, default 5
     */
    function coordsToString(coords, decimals = 5) {
        return "[" + roundToDecimals(coords[0], decimals) + ", " + roundToDecimals(coords[1], decimals) + "]";
    }

    /** Pyöristää luvun n desimaaliin
     * @param {Number} num Pyöristettävä luku
     * @param {Number} decimals Montako desimaalia? Default 2
     */
    function roundToDecimals(num, decimals = 2) {
        let mult = Math.pow(10, decimals);
        return Math.round(num * mult) / mult;
    }

    /** Asettaa tekstivaluen
     * @param {String} type Mitä muutetaan. Tulee löytyä switch-lauseesta
     * @param {Event} event Eventti inputista
     */
    function handleInput(type, event) {
        event.preventDefault();
        const value = event.target.value;

        switch (type) {
            case 'date':
                setInputDate(value);
                setTemps([]);
                break;
            case 'city':
                setInputCity(value);
                break;
            default:
                console.log(`Uncaught input type ${type}.`);
        }
    }

    /** Avain elementeille joita tulee dynaamisesti puuhun */
    let key = 0;

    /**Palauttaa otsikkorivin säätableen */
    function weatherTableHeaders() {

        var sortSign = 1;

        if (selectedLocation === yk) {
            return (
                <tr>
                    <th onClick={() => sortWeatherData(sortWeatherDataName, nameSort)}>{"Paikka" + sortMerkki(nameSort)}</th>
                    <th onClick={() => sortWeatherData(sortWeatherDataTemp, tempSort)}>{"Lämpötila" + sortMerkki(tempSort)}</th>
                    <th onClick={() => sortWeatherData(sortWeatherDataRain, rainSort)}>{"Sade" + sortMerkki(rainSort)}</th>
                    <th onClick={() => sortWeatherData(sortWeatherDataWind, windSort)}>{"Tuuli" + sortMerkki(windSort)}</th>
                </tr>
            );
        }
        else {
            return (
                <tr>
                    <th>Aika</th>
                    <th>Lämpötila</th>
                    <th>Sade</th>
                    <th>Tuuli</th>
                </tr>
            );
        }

        /** Sorttaa säädatan funktiolla ja tarkastaa tyypin
         * @param {Function(a,b)} sortFunc Vertailufunktio
         * @param {String} type Järjestysperusta
         */
        function sortWeatherData(sortFunc, type) {
            if (temps.length < 1) return;

            sortSign = ykSort.dir;

            if (ykSort.type === type) {
                sortSign = -sortSign;
                setYkSort({
                    "type": ykSort.type,
                    "dir": -ykSort.dir
                });
            }
            else {
                sortSign = 1;
                setYkSort({
                    "type": type,
                    "dir": 1
                });
            }

            setTemps(Array.from(temps).sort(sortFunc));
        }

        /** Palauttaa sopivan merkin näytettäväksi järjestystyypille
         * @param {String} sortType Järjestysperusta jota katsotaan
         */
        function sortMerkki(sortType) {
            return ykSort.type === sortType ? (ykSort.dir > 0 ? "↑" : "↓") : "";
        }

        /** Vertaa nimen mukaan */
        function sortWeatherDataName(a, b) {
            let aName = a.location;
            let bName = b.location;

            // return ykSort.dir * (aName < bName ? -1 : (bName < aName ? 1 : 0));
            return sortSign * (aName < bName ? -1 : (bName < aName ? 1 : 0));
        }

        /** Vertaa sateen mukaan */
        function sortWeatherDataRain(a, b) {
            console.log(a);
            let aVal = a.weatherData[Number.parseInt(ykTime)].rain;
            let bVal = b.weatherData[Number.parseInt(ykTime)].rain;

            if (aVal.length < 1) return 1;
            if (bVal.length < 1) return -1;

            return sortSign * (aVal < bVal ? -1 : (bVal < aVal ? 1 : 0));
        }

        /** Vertaa lämpötilan mukaan */
        function sortWeatherDataTemp(a, b) {
            let aVal = a.weatherData[ykTime].temp;
            let bVal = b.weatherData[ykTime].temp;

            if (aVal.length < 1) return 1;
            if (bVal.length < 1) return -1;

            return sortSign * (Number.parseFloat(aVal) - Number.parseFloat(bVal));
            // return sortSign * (aVal < bVal ? -1 : (bVal < aVal ? 1 : 0));
        }

        /** Vertaa tuulen mukaan */
        function sortWeatherDataWind(a, b) {
            let aVal = a.weatherData[Number.parseInt(ykTime)].wind;
            let bVal = b.weatherData[Number.parseInt(ykTime)].wind;

            if (aVal.length < 1) return 1;
            if (bVal.length < 1) return -1;

            return sortSign * (aVal < bVal ? -1 : (bVal < aVal ? 1 : 0));
        }
    }

    /**Palauttaa rivit säätableen */
    function weatherTableContents() {
        if (temps.length < 1) return;
        if (selectedLocation === yk) {
            return temps.map(function (loc) {
                let timedData = loc.weatherData[Math.min(Math.max(Math.round(ykTime), 0), 23)];
                let cellClass = timedData.isForecast ? "forecastCell" : "observedCell";
                if (!timedData) {
                    return undefined;
                }
                return (
                    <tr key={"weather_map_data_row_" + key++}>
                        <td>
                            {loc.location}
                        </td>
                        {/* <td>
                            {timedData.time}
                        </td> */}
                        <td className = {cellClass}>
                            {(timedData.temp && timedData.temp.length > 0) ? (timedData.temp + "°C") : "-"}
                        </td>
                        <td className = {cellClass}>
                            {(timedData.rain && timedData.rain.length > 0) ? (timedData.rain + " mm") : "-"}
                        </td>
                        <td className = {cellClass}>
                            {(timedData.wind && timedData.wind.length > 0) ? (timedData.wind + " m/s") : "-"}
                        </td>
                    </tr>
                )
            });
        }
        else {
            return temps[0].weatherData.map(
                function (item) {
                    let cellClass = item.isForecast ? "forecastCell" : "observedCell";
                    return (
                        <tr key={"weather_map_data_row_" + key++} className = {cellClass}>
                            <td>
                                {item.time}
                            </td>
                            <td>
                                {(item.temp && item.temp.length > 0) ? (item.temp + "°C") : "-"}
                            </td>
                            <td>
                                {(item.rain && item.rain.length > 0) ? (item.rain + " mm") : "-"}
                            </td>
                            <td>
                                {(item.wind && item.wind.length > 0) ? (item.wind + " m/s") : "-"}
                            </td>
                        </tr>
                    );
                }
            );
        }
    }

    /** Piirtää kartan. Yleiskatsaukessa zoomaa kaikkiin */
    function drawMap() {
        if (selectedLocation === yk) {
            return (
                <LeafletMap id="leafletMap" center={mapPos} bounds={paikat.map((p) => p.coordinates)} onClick={mapClick.bind(null, true)} doubleClickZoom={false}>
                    <TileLayer
                        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {drawMarkers()}
                </LeafletMap>
            );
        }
        else {
            return (
                <LeafletMap id="leafletMap" center={mapPos} zoom={9} onClick={mapClick.bind(null, false)} doubleClickZoom={false}>
                    <TileLayer
                        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {drawMarkers()}
                </LeafletMap>
            );
        }
    }

    /** Piirtää valitun sijainnin kartalle markerina */
    function drawMarkers() {
        function getMarkerData(tp) {
            if (tp.weatherData[ykTime]) {
                return (<div>
                    { tp.weatherData[ykTime].temp + "°C"} <br />
                    { stringOr(tp.weatherData[ykTime].wind, "-") + " m/s"} <br />
                    { stringOr(tp.weatherData[ykTime].rain, "-") + " mm"} <br />
                </div>);
            }
            return undefined;
        }

        if (selectedLocation === yk) {

            if (temps.length > 0) {
                return temps.map(
                    function (tp) {
                        return tp.coordinates !== null && (
                            <Marker position={tp.coordinates} key={"city_marker_overview_" + key++}>
                                <Popup>
                                    {tp.location}<br />
                                    {getMarkerData(tp)}
                                </Popup>
                            </Marker>
                        );
                    }
                );
            }
            return paikat.map(
                function (paikka) {
                    return (
                        <Marker position={paikka.coordinates} key={"city_marker_overview_" + key++}>
                            <Popup>
                                {paikka.name}<br />
                            </Popup>
                        </Marker>
                    );
                }
            );
        }
        else {
            return (
                <Marker position={clickPos}>
                    <Popup>{selectedLocation}<br />{"[" + clickPos.join(",") + "]"}</Popup>
                </Marker>
            );
        }
    }

    return (
        <div className='App' id="mapDiv">
            <h1>Map</h1>
            <table>
                <tbody>
                    <tr>
                        <td>
                            <input className="date" value={inputCity} onChange={handleInput.bind(null, "city")} placeholder="Valitse kartalta tai hae" />
                        </td>
                        <td className="leftAlign">
                            <button onClick={textSearch} disabled={!allowSearch}>Etsi sijainti</button>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input className="date" type="date" value={inputDate} onChange={handleInput.bind(null, "date")} placeholder="pp/kk/vvvv" pattern="\d{4}-\d{2}-\d{2}" />
                        </td>
                        <td className="leftAlign">
                            <button onClick={
                                (e) => {
                                    //setInputCity(yk);
                                    changeLocation(yk);
                                    setSearchError("");
                                }
                            } disabled={false || !allowSearch}>{yk}</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table id="baseTable">
                <tbody>
                    <tr>
                        <td id="mapCell">
                            {drawMap()}
                        </td>
                        <td id="mapInfoCell">
                            <h2>{selectedLocation}<br />{inputDate} {selectedLocation === yk && ("klo " + ykTime)}</h2>
                            <button onClick={getWeather} disabled={!allowSearch || searchError.length > 0}>Hae sää</button>
                            <div className="error">{searchError}</div>
                            <table id="weatherInfoTable">
                                <tbody>
                                    {
                                        weatherTableHeaders()
                                    }
                                    {
                                        weatherTableContents()
                                    }
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
            <Sources />
        </div>
    );
}

export default Map;