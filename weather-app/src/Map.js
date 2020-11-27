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

        getWeatherData(["temperature", "ws_10min", "r_1h"], inputDateToDate(inputDate), 1, selectedLocation, handleWeather);
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

            var wData = data.locations[0].data;
            var newDatas = [];
            var tempPairs = wData.temperature.timeValuePairs;
            var rainPairs =  wData.r_1h.timeValuePairs;
            var windPairs =  wData.ws_10min.timeValuePairs;

            for (let i = 0; i < tempPairs.length - 1; i++) {
                let tp = tempPairs[i];
                let dataCell = {};
                let dateTime = new Date(tp.time);

                //Aseta aika
                dataCell.time = "" + dateTime.getHours();
                if (dataCell.time.length < 2) dataCell.time = "0" + dataCell.time;

                //Lämpötila
                dataCell.temp = Number.isNaN(tp.value) ? "" : ("" + tp.value);
                //if (dataCell.temp.charAt(0) !== '-') dataCell.temp = " " + dataCell.temp;

                //Sade
                let rp = rainPairs[i];
                dataCell.rain = Number.isNaN(rp.value) ? "" : ("" + rp.value);

                //Tuuli
                let wp = windPairs[i];
                dataCell.wind = Number.isNaN(wp.value) ? "" : ("" + wp.value);

                newDatas.push(dataCell);
            }

            // for (let i = 0; i < rainPairs.length - 1; i++) {
            //     let rp = rainPairs[i];
            //     let dataCell = newDatas[i];
            //     dataCell.rain = Number.isNaN(rp.value) ? "-" : ("" + rp.value);
            // }

            // for (let i = 0; i < windPairs.length - 1; i++) {
            //     let wp = windPairs[i];
            //     let dataCell = newDatas[i];
            //     dataCell.wind = Number.isNaN(wp.value) ? "-" : ("" + wp.value);
            // }

            setTemps(newDatas);
        }
        else {
            console.log(errors);
        }
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

    return (
        <div className='App' id="mapDiv">
            <h1>Map</h1>
            <table>
                <tbody>
                    <tr>
                        <td>
                            <input className="date" value={inputCity} onChange={handleInput.bind(null, "city")} placeholder="Valitse kartalta tai hae" />
                            <button onClick={textSearch} disabled={!allowSearch}>Etsi sijainti</button>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input className="date" type="date" value={inputDate} onChange={handleInput.bind(null, "date")} placeholder="pp/kk/vvvv" pattern="\d{4}-\d{2}-\d{2}"/>                            
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
                            <h2>{selectedLocation}<br />{inputDate}</h2>
                            <button onClick={getWeather} disabled={!allowSearch || searchError.length > 0}>Hae sää</button>
                            <div className="error">{searchError}</div>
                            <table id="weatherInfoTable">
                                <tbody>
                                    <tr>
                                        <td>Aika</td>
                                        <td>Lämpötila</td>
                                        <td>Sade</td>
                                        <td>Tuuli</td>
                                    </tr>
                                    {
                                        temps.map(
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
                                                )
                                            }
                                        )
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