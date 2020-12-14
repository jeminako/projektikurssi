import React from 'react';
import './App.css';

function Sources() {
    return (
        <footer className="sources">
            <header>Lähteet:</header>
            <p>Kaikki sovelluksen säädata on saatu Ilmatieteen laitoksen toimittamista <a href="https://www.ilmatieteenlaitos.fi/avoin-data">tietoaineistoista.</a> Data on lisensioitu © <a href="https://creativecommons.org/licenses/by/4.0/deed.fi">CC BY 4.0-lisenssillä.</a></p>
            <p>Karttakuviin käytetty <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> dataa,
            joka on saatavilla <a href="https://opendatacommons.org/licenses/odbl/">Open Data Commons Open Database</a>-lisenssillä</p>
            <p>Kartan paikkatiedot haetaan <a href="https://nominatim.openstreetmap.org/ui/search.html">Nominative</a>-kirjaston APIsta (<a href="https://openstreetmap.org/copyright">OpenStreetMap-tekijänoikeudet</a>, <a href="https://operations.osmfoundation.org/policies/nominatim/">Usage policy</a>).</p>
            <p>Icons made by <a href="https://www.flaticon.com/authors/bqlqn" title="bqlqn">bqlqn</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></p>
        </footer>
    );
}

export default Sources;