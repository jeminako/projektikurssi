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
                <Link style={homeStyle} to='/'>
                    <li>Koti</li>
                </Link>
                <Link style={navStyle} to='/map'>
                    <li>Kartta</li>
                </Link>
                <Link style={navStyle} to='/topweather'>
                    <li>Kohokohdat</li>
                </Link>
                <Link style={navStyle} to='/ourforecast'>
                    <li>Meidän ennuste</li>
                </Link>
            </ul>
        </nav>
    );
}

export default Navigation;