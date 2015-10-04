require('es6-shim');

const intent = require('./intent');
const makeTime$ = require('./time');
const record = require('./record-streams');
const timeTravelBarView = require('./view');
const scopedDOM = require('./scoped-dom');

const Cycle = require('@cycle/core');
const {makeDOMDriver} = require('@cycle/dom');

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

  const streamsToDisplay$ = new Cycle.Rx.Subject();

  const timeTravelMain = function ({DOM}) {
    const timeTravel = TimeTravel(DOM, streamsToDisplay$.startWith([]));

    return {
      DOM: timeTravel.DOM,
      TIME: timeTravel.time$
    };
  };

  const [timeRequests, timeResponses] = Cycle.run(timeTravelMain, {DOM: timeTravelDOMDriver});

  drivers.DOM.enableTimeTravel(timeRequests.TIME);

  const [requests, responses] = Cycle.run(main, drivers);

  // TODO - walk tree of stream sources
  const streamsToDisplay = walkObservableTree(requests.DOM.source).map((stream, index) => {
    if (stream.accumulator) {
      return {stream: stream, label: accumulatorLabel(stream.accumulator)};
    }

    return {stream: stream, label: index.toString()};
  });

  setTimeout(() => {
    streamsToDisplay$.onNext(streamsToDisplay);
  }, 1);

  return [requests, responses];
}

function TimeTravel (DOM, streams$, name = '.time-travel') {
  const {timeTravelPosition$, playing$} = intent(scopedDOM(DOM, name));

  const time$ = makeTime$(playing$, timeTravelPosition$);

  const recordedStreams$ = record(streams$, time$);

  return {
    DOM: timeTravelBarView(name, time$, playing$, recordedStreams$),
    time$
  };
}

TimeTravel.run = run;

module.exports = TimeTravel;
