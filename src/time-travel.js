require('es6-shim');

const {Rx} = require('@cycle/core');
const {h} = require('@cycle/dom');

const renderStreams = require('./render-streams');
const stylesheet = require('./style');
const intent = require('./intent');
const makeTime$ = require('./time');
const record = require('./record-streams');
const timeTravelStreams = require('./time-travel-streams');

function scopedDOM (DOM, scope) {
  return {
    select (selector) {
      return DOM.select(`${scope} ${selector}`);
    }
  };
}

function logStreams (DOM, streams, name = '.time-travel') {
  const {timeTravelPosition$, playing$} = intent(scopedDOM(DOM, name));

  const time$ = makeTime$(playing$, timeTravelPosition$);

  const recordedStreams = record(streams, time$);

  const timeTravel = timeTravelStreams(recordedStreams, time$);

  return {
    DOM: Rx.Observable.combineLatest(time$, playing$, ...recordedStreams,
      (currentTime, playing, ...streamValues) => {
        return h(name, [
          stylesheet(),
          h('button.pause', playing ? 'Pause' : 'Play'),
          renderStreams(currentTime, ...streamValues)
        ]);
      }
    ),

    timeTravel
  };
}

module.exports = logStreams;
