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
 * @param {Number} days Montako päivää haetaan aloituspäivästä
 * @param {String} location Sijainnin nimi
 * @param {Function} onSuccess kutsuttava funktio kun haku palautuu. Muodossa function(data={}, errors=[])
 */
function getWeatherData(reqParams, startDate, days, location, onSuccess) {
    let reqParam = reqParams.join(",");
    var SERVER_URL = "http://opendata.fmi.fi/wfs";
    var STORED_QUERY_OBSERVATION = "fmi::observations::weather::multipointcoverage";
    var parser = new Metolib.WfsRequestParser();
    let endDate = new Date(startDate.getTime() + 86400000 * days);

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

function Map() {

    /** JKL kompassi koords :D */
    const KOMPASSI = [62.242631, 25.747356];

    /** Erilaisia tyyppjeä joita nominativin antamassa address-oliossa voi olla nimettynä */
    const PLACE_TYPES = ["village", "town", "city", "municipality", "county", "country"];

    const [clickPos, setClickPos] = useState(KOMPASSI);
    const [mapPos, setMapPos] = useState(KOMPASSI);
    const [inputCity, setInputCity] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("Jyväskylä");
    const [inputDate, setInputDate] = useState(new Date().toJSON().slice(0, 10));
    const [searchError, setSearchError] = useState("");
    const [allowSearch, setAllowSearch] = useState(true);

    const [temps, setTemps] = useState([]);
    const [ykTime, setYkTime] = useState(12);
    const [ykSort, setYkSort] = useState({
        "type": "",
        "dir": 1
    });

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

        //Käytä annettua paikkaa tai valmista settiä
        let hakupaikka = (selectedLocation !== yk) ? selectedLocation : (paikat.map(function (p) {
            return p.name;
        }));

        console.log(hakupaikka);

        getWeatherData(
            ["temperature", "ws_10min", "r_1h"],
            inputDateToDate(inputDate),
            1,
            hakupaikka,
            handleWeather
        );
        // getWeatherData(["temperature"], inputDateToDate(inputDate), 1, selectedLocation, handleWeather);
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
                    newDatas.push(handleWeatherLocationData(data.locations[i].data, paikat[i].name));
                }
                setTemps(newDatas);
            }
            else {
                ///** Taulukko säädatasta */
                //var newDatas = [];
                // var wData = data.locations[0].data;
                // var tempPairs = wData.temperature.timeValuePairs;
                // var rainPairs = wData.r_1h.timeValuePairs;
                // var windPairs = wData.ws_10min.timeValuePairs;

                // for (let i = 0; i < tempPairs.length - 1; i++) {
                //     let dataCell = {};
                //     let tp = tempPairs[i];
                //     let dateTime = new Date(tp.time);

                //     //Aseta aika
                //     dataCell.time = "" + dateTime.getHours();
                //     if (dataCell.time.length < 2) dataCell.time = "0" + dataCell.time;

                //     //Lämpötila
                //     dataCell.temp = Number.isNaN(tp.value) ? "" : ("" + tp.value);

                //     //Sade
                //     let rp = rainPairs[i];
                //     dataCell.rain = Number.isNaN(rp.value) ? "" : ("" + rp.value);

                //     //Tuuli
                //     let wp = windPairs[i];
                //     dataCell.wind = Number.isNaN(wp.value) ? "" : ("" + wp.value);

                //     newDatas.push(dataCell);
                // }

                // setTemps(newDatas);
                setTemps([handleWeatherLocationData(data.locations[0].data, selectedLocation)]);
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
    function handleWeatherLocationData(locationData, locationName = "") {
        var tempPairs = locationData.temperature.timeValuePairs;
        var rainPairs = locationData.r_1h.timeValuePairs;
        var windPairs = locationData.ws_10min.timeValuePairs;

        let data = {
            "location": locationName,
            "weatherData": []
        };

        for (let i = 0; i < tempPairs.length - 1; i++) {
            let dataCell = {};
            let tp = tempPairs[i];
            let dateTime = new Date(tp.time);

            //Aseta aika
            dataCell.time = "" + dateTime.getHours();
            if (dataCell.time.length < 2) dataCell.time = "0" + dataCell.time;

            //Lämpötila
            dataCell.temp = Number.isNaN(tp.value) ? "" : ("" + tp.value);

            //Sade
            let rp = rainPairs[i];
            dataCell.rain = Number.isNaN(rp.value) ? "" : ("" + rp.value);

            //Tuuli
            let wp = windPairs[i];
            dataCell.wind = Number.isNaN(wp.value) ? "" : ("" + wp.value);

            data.weatherData.push(dataCell);
        }

        return data;
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
     * @param {Event} e HTML eventti
     */
    function mapClick(e) {
        if (searchCooldown()) {
            console.log("Liian nopeita hakuja!");
            return;
        }

        setClickPos([e.latlng.lat, e.latlng.lng]);

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
        if (selectedLocation === yk) {
            return (
                <tr>
                    <th onClick={() => sortWeatherData(sortWeatherDataName, "name")}>Paikka</th>
                    <th onClick={() => sortWeatherData(sortWeatherDataTemp, "temp")}>Lämpötila</th>
                    <th onClick={() => sortWeatherData(sortWeatherDataRain, "rain")}>Sade</th>
                    <th onClick={() => sortWeatherData(sortWeatherDataWind, "wind")}>Tuuli</th>
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

        function sortWeatherData(sortFunc, type) {
            if (temps.length < 1) return;
            setTemps(Array.from(temps).sort(sortFunc));
            if (ykSort.type === type) {
                console.log("sama");
                setYkSort({
                    "type": ykSort.type,
                    "dir": -ykSort.dir
                });
            }
            else {
                console.log("eri");
                setYkSort({
                    "type": type,
                    "dir": 1
                });
            }
        }

        function sortWeatherDataName(a, b) {
            let aName = a.location;
            let bName = b.location;

            return ykSort.dir * (aName < bName ? -1 : (bName < aName ? 1 : 0));
        }

        function sortWeatherDataRain(a, b) {
            console.log(a);
            let aVal = a.weatherData[Number.parseInt(ykTime)].rain;
            let bVal = b.weatherData[Number.parseInt(ykTime)].rain;

            return ykSort.dir * (aVal < bVal ? -1 : (bVal < aVal ? 1 : 0));
        }

        function sortWeatherDataTemp(a, b) {
            let aVal = a.weatherData[Number.parseInt(ykTime)].temp;
            let bVal = b.weatherData[Number.parseInt(ykTime)].temp;

            return ykSort.dir * (aVal < bVal ? -1 : (bVal < aVal ? 1 : 0));
        }

        function sortWeatherDataWind(a, b) {
            let aVal = a.weatherData[Number.parseInt(ykTime)].wind;
            let bVal = b.weatherData[Number.parseInt(ykTime)].wind;

            return ykSort.dir * (aVal < bVal ? -1 : (bVal < aVal ? 1 : 0));
        }
    }

    /**Palauttaa rivit säätableen */
    function weatherTableContents() {
        if (temps.length < 1) return;
        if (selectedLocation === yk) {
            return temps.map(function (loc) {
                let timedData = loc.weatherData[Math.min(Math.max(Math.round(ykTime), 0), 23)];
                return (
                    <tr key={"weather_map_data_row_" + key++}>
                        <td>
                            {loc.location}
                        </td>
                        {/* <td>
                            {timedData.time}
                        </td> */}
                        <td>
                            {timedData.temp.length > 0 ? (timedData.temp + "°C") : "-"}
                        </td>
                        <td>
                            {timedData.rain.length > 0 ? (timedData.rain + " mm") : "-"}
                        </td>
                        <td>
                            {timedData.wind.length > 0 ? (timedData.wind + " m/s") : "-"}
                        </td>
                    </tr>
                )
            });
        }
        else {
            return temps[0].weatherData.map(
                function (item) {
                    return (
                        <tr key={"weather_map_data_row_" + key++}>
                            <td>
                                {item.time}
                            </td>
                            <td>
                                {item.temp.length > 0 ? (item.temp + "°C") : "-"}
                            </td>
                            <td>
                                {item.rain.length > 0 ? (item.rain + " mm") : "-"}
                            </td>
                            <td>
                                {item.wind.length > 0 ? (item.wind + " m/s") : "-"}
                            </td>
                        </tr>
                    );
                }
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
                                    setSelectedLocation(yk);
                                }
                            } disabled={!allowSearch}>{yk}</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table id="baseTable">
                <tbody>
                    <tr>
                        <td id="mapCell">
                            <LeafletMap id="leafletMap" center={mapPos} zoom={9} onClick={mapClick} doubleClickZoom={false}>
                                <TileLayer
                                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={clickPos}>
                                    <Popup>{selectedLocation}<br />{clickPos}</Popup>
                                </Marker>
                            </LeafletMap>
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