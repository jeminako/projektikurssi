import React, { useState } from 'react'
import './App.css';

export class WeatherReal extends React.Component {
    render() {
        return (
            <div className="expected">
                <header>REALITY</header>
                <div className="weatherBar">
                    <div className="temp">
                    <header className="time">00:00</header>
                    <div className="t">5,2°c</div>
                    </div>
                    <div className="temp">
                    <header className="time">08:00</header>
                    <div className="t">6,6°c</div>
                    </div>
                    <div className="temp">
                    <header className="time">16:00</header>
                    <div className="t">6,5°c</div>
                    </div>
                    <div className="temp">
                    <header className="time">24:00</header>
                    <div className="t">4,0°c</div>
                    </div>
                </div>
            </div>
        );
    }
}
