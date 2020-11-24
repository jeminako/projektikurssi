import React from 'react';
import './Map.css';
import { Map as LeafletMap, Marker, Popup, TileLayer } from "react-leaflet";
import Metolib from '@fmidev/metolib';

function Map() {

    const KOMPASSI = [62.242631, 25.747356];

    const [clickPos, setClickPos] = React.useState([62.242631, 25.747356]);

    function mapClick(e) {
        setClickPos([e.latlng.lat, e.latlng.lng]);
        console.log(e.latlng);
    }

    return (
        <div className='App'>
            <h1>Map</h1>
            <LeafletMap center={KOMPASSI} zoom={4} onclick={mapClick}>
                <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={clickPos}>
                    <Popup>A pretty CSS3 popup. <br /> Easily customizable.</Popup>
                </Marker>
            </LeafletMap>
        </div>
    );
}

export default Map;