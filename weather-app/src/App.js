import React from 'react';
import './App.css';
import Navigation from './Navigation';
import Home from './Home';
import TopWeather from './TopWeather'
import Map from './Map'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

function App () {
  return (
    <Router>
      <div>
        <Navigation />
        <Switch>
          <Route path="/" exact component={Home}></Route>
          <Route path="/map" component={Map}></Route>
          <Route path="/topweather" component={TopWeather}></Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
