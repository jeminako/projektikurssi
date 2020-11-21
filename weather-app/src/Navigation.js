import React from 'react';
import './App.css';
import { Link } from 'react-router-dom';

function Navigation() {
    const navStyle = {
        color: 'white',
        textDecoration: 'none'
    };

    const homeStyle = {
        color: 'white',
        textDecoration: 'none',
        fontSize: 'large',
        fontWeight: 'bold'
    }

    return (
        <nav>
            <ul className='links'>
                <Link style={navStyle} to='/map'>
                    <li>Map</li>
                </Link>
                <Link style={homeStyle} to='/'>
                    <li>Home</li>
                </Link>
                <Link style={navStyle} to='/topweather'>
                    <li>Top</li>
                </Link>
            </ul>
        </nav>
    );
}

export default Navigation;