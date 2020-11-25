import React, { useState } from 'react';
import './Map.css';
import './App.css';
import { Map as LeafletMap, Marker, Popup, TileLayer } from "react-leaflet";
//import Metolib from '@fmidev/metolib';

function Map() {

    /** JKL kompassi koords :D */
    const KOMPASSI = [62.242631, 25.747356];

    /** Erilaisia tyyppjeä joita nominativin antamassa address-oliossa voi olla nimettynä */
    const PLACE_TYPES = ["town", "city", "municipality", "county"];

    const [clickPos, setClickPos] = useState(KOMPASSI);
    const [inputCity, setInputCity] = useState("Jyväskylä");
    const [selectedLocation, setSelectedLocation] = useState("Jyväskylä");
    const [inputDate, setInputDate] = useState("");
    const [searchError, setSearchError] = useState("");

    /** Hakee JSONP-objektin URLstä
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

        script.src = url.replace('json_callback=?', 'json_callback=' + ud);
        head.appendChild(script);

    }

    function mapClick(e) {
        setClickPos([e.latlng.lat, e.latlng.lng]);

        //Hae paikka
        getJSONP(
            'https://nominatim.openstreetmap.org/reverse?lat=' + e.latlng.lat + "&lon=" + e.latlng.lng + "&format=jsonv2&json_callback=?",
            function (data) {
                //console.log(data);

                var error = "";
                /** Löytyikö paikalle nimi */
                var loytyi = false;

                if (data === undefined || data === null || data.address === undefined || data.address === null) {
                    //Ei validi vastaus
                    error = "Paikkatietoja ei ole saatavilla";
                }
                else {
                    let addr = data.address;

                    if (data.address.country_code !== "fi") {
                        error = "Säätiedot saatavilla vain Suomessa";
                    }

                    for (let pt of PLACE_TYPES) {
                        if (addr[pt] !== undefined) {
                            setSelectedLocation(addr[pt]);
                            setInputCity(addr[pt]);
                            loytyi = true;
                            break;
                        }
                    }
                }

                if (!loytyi) {
                    //Aseta koords
                    let s = latLngToString(e.latlng);
                    setSelectedLocation(s);
                    setInputCity(s);
                }

                setSearchError(error);
            }
        );
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
                break;
            case 'city':
                setInputCity(value);
                break;
            default:
                console.log(`Uncaught input type ${type}.`);
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
                            <button>Etsi sijainti</button>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input className="date" value={inputDate} onChange={handleInput.bind(null, "date")} placeholder="pp/kk/vvvv" />
                            <button>Hae sää</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table id="baseTable">
                <tbody>
                    <tr>
                        <td id="mapCell">
                            <LeafletMap center={KOMPASSI} zoom={10} onclick={mapClick}>
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
                            <h2>{selectedLocation}</h2>
                            <div className="error">{searchError}</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default Map;