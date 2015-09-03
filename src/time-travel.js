require('es6-shim');

const {Rx} = require('@cycle/core');
const {h} = require('@cycle/dom');

const renderStreams = require('./render-streams');
const stylesheet = require('./style');
const intent = require('./intent');
const makeTime$ = require('./time');

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

  const loggedStreams = streams.map(streamInfo => {
    return streamInfo.stream
      .withLatestFrom(time$, (ev, time) => ({
        timestamp: time, value: ev
      }))
      .scan((events, newEvent) => {
        const newEvents = events.concat([newEvent]);

        newEvents.label = streamInfo.label;
        newEvents.options = {feature: streamInfo.feature || false};

        return newEvents;
      }, []
    ).share().startWith([]);
  });

  loggedStreams.forEach((loggedStream, index) => {
    timeTravel[streams[index].label] = Rx.Observable.combineLatest(
        time$,
        loggedStream,
        (time, events) => (events.slice(0)
          .reverse().find(val => val.timestamp <= time) ||
          events[events.length - 1])
      )
      .filter(thing => thing !== undefined && thing.value !== undefined)
      .map(v => v.value)
      .distinctUntilChanged();
  });

  return {
    DOM: Rx.Observable.combineLatest(time$, playing$, ...loggedStreams,
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
