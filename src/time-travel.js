require('es6-shim');

const {Rx} = require('@cycle/core');
const {h} = require('@cycle/dom');

const renderStreams = require('./render-streams');
const stylesheet = require('./style');
const intent = require('./intent');
const makeTime$ = require('./time');
const record = require('./record-streams');

function scopedDOM (DOM, scope) {
  return {
    select (selector) {
      return DOM.select(`${scope} ${selector}`);
    }
  };
}

function logStreams (DOM, streams, name = '.time-travel') {
  const timeTravel = {};

  const timeTravelDOM = scopedDOM(DOM, name);
  const {timeTravelPosition$, playing$} = intent(timeTravelDOM);

  const time$ = makeTime$(playing$, timeTravelPosition$);

  const recordedStreams = record(streams, time$);

  recordedStreams.forEach((recordedStream, index) => {
    timeTravel[streams[index].label] = Rx.Observable.combineLatest(
        time$,
        recordedStream,
        (time, events) => (events.slice(0)
          .reverse().find(val => val.timestamp <= time) ||
          events[events.length - 1])
      )
      .filter(thing => thing !== undefined && thing.value !== undefined)
      .map(v => v.value)
      .distinctUntilChanged();
  });

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
