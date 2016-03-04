require('es6-shim');

const intent = require('./intent');
const makeTime$ = require('./time');
const record = require('./record-streams');
const timeTravelBarView = require('./view');
const scopedDOM = require('./scoped-dom');
const {restart, restartable} = require('cycle-restart');

const Cycle = require('@cycle/core');
const {makeDOMDriver} = require('@cycle/dom');
const {Subject} = require('rx');

function walkObservableTree (stream) {
  if (stream.sources === undefined && stream.source === undefined) {
    return [stream];
  }

  if (stream.sources) {
    return [stream].concat(...stream.sources.s.map(walkObservableTree));
  }

  if (stream.source) {
    return [stream].concat(walkObservableTree(stream.source));
  }
}

function accumulatorLabel (accumulator) {
  return accumulator.toString()
    .replace(/"use strict";\n\n/g, '')
    .split('\n')
    .join('')
    .replace('  ', '');
}

function run (main, drivers) {
  const timeTravelBarNode = document.createElement('div');
  document.body.appendChild(timeTravelBarNode);

  const timeTravelDOMDriver = makeDOMDriver(timeTravelBarNode);

  const streamsToDisplay$ = new Subject();

  const timeTravelMain = function ({DOM}) {
    const timeTravel = TimeTravel(DOM, streamsToDisplay$.startWith([]));

    return {
      DOM: timeTravel.DOM,
      TIME: timeTravel.time$,
      restart$: timeTravel.restart$
    };
  };

  const {sources: timeSources, sinks: timeSinks} = Cycle.run(timeTravelMain, {DOM: timeTravelDOMDriver});

  const restartableDrivers = {};

  Object.keys(drivers).forEach(driverName => {
    let args = {};

    if (driverName === 'DOM') {
      args = {pauseSinksWhileReplaying: false};
    }

    restartableDrivers[driverName] = restartable(drivers[driverName], args);
  });

  let {sources, sinks} = Cycle.run(main, restartableDrivers);

  const startTime = new Date();

  timeSinks.restart$.withLatestFrom(timeSinks.TIME).subscribe(([relative, time]) => {
    console.log('honking good time', relative, new Date());
    const timeToTravelTo = startTime.valueOf() + time
    const blah = restart(main, restartableDrivers, {sources, sinks}, null, new Date(timeToTravelTo))
    sinks = blah.sinks
    sources = blah.sources

    const streamsToDisplay = [sources.DOM.log$.tap(log => log.label = 'DOM')];

    setTimeout(() => {
      streamsToDisplay$.onNext(streamsToDisplay);
    }, 1);
  });

  //const streamsToDisplay = walkObservableTree(sinks.DOM.source).map((stream, index) => {
  //  if (stream.accumulator) {
  //    return {stream: stream, label: accumulatorLabel(stream.accumulator)};
  //  }
//
//    return {stream: stream, label: index.toString()};
//  });

    const streamsToDisplay = [sources.DOM.log$.tap(log => log.label = 'DOM')];

  setTimeout(() => {
    streamsToDisplay$.onNext(streamsToDisplay);
  }, 1);

  return {sinks, sources};
}

function TimeTravel (DOM, streams$, name = '.time-travel') {
  const {timeTravelPosition$, playing$} = intent(scopedDOM(DOM, name));

  const time$ = makeTime$(playing$, timeTravelPosition$);

  const restart$ = timeTravelPosition$.distinctUntilChanged().sample(50).skip(1);
  const recordedStreams$ = record(streams$, time$);

  return {
    DOM: timeTravelBarView(name, time$, playing$, streams$),
    time$,
    restart$
  };
}

TimeTravel.run = run;

module.exports = TimeTravel;
