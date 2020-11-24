import React, { useState } from 'react';
import './Map.css';
import { Map as LeafletMap, Marker, Popup, TileLayer } from "react-leaflet";
//import Metolib from '@fmidev/metolib';

function Map() {

    const KOMPASSI = [62.242631, 25.747356];

    const [clickPos, setClickPos] = useState(KOMPASSI);
    const [inputCity, setInputCity] = useState("Jyväskylä");
    const [inputDate, setInputDate] = useState("");

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
        console.log(e.latlng);

        //Hae paikka
        getJSONP(
            'https://nominatim.openstreetmap.org/reverse?lat=' + e.latlng.lat + "&lon=" + e.latlng.lng + "&format=jsonv2&json_callback=?",
            function (data) {
                console.log(data);
            }
        );
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
                                    <Popup>A pretty CSS3 popup. <br /> Easily customizable.</Popup>
                                </Marker>
                            </LeafletMap>
                        </td>
                        <td id="mapInfoCell">
                            <h2>{inputCity}</h2>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default Map;