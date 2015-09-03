require('es6-shim');

const intent = require('./intent');
const makeTime$ = require('./time');
const record = require('./record-streams');
const timeTravelStreams = require('./time-travel-streams');
const timeTravelBarView = require('./view');
const scopedDOM = require('./scoped-dom');

function logStreams (DOM, streams, name = '.time-travel') {
  const {timeTravelPosition$, playing$} = intent(scopedDOM(DOM, name));

  const time$ = makeTime$(playing$, timeTravelPosition$);

  const recordedStreams = record(streams, time$);

  const timeTravel = timeTravelStreams(recordedStreams, time$);

  return {
    DOM: timeTravelBarView(time$, playing$, recordedStreams),
    timeTravel
  };
}

module.exports = logStreams;
