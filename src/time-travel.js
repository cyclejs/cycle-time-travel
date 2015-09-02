require('es6-shim');

const {Rx} = require('@cycle/core');
const {h} = require('@cycle/dom');

const renderStreams = require('./render-streams');
const stylesheet = require('./style');

const makeTimeTravelPosition$ = require('./calculate-time-travel-position');

function getCurrentTime () {
  return new Date().getTime();
}

function getMousePosition (ev) {
  return {
    x: ev.clientX,
    y: ev.clientY
  };
}

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

  const mousePosition$ = timeTravelDOM.select('.stream').events('mousemove')
    .map(getMousePosition)
    .startWith({x: 0, y: 0});

  const click$ = timeTravelDOM.select('.stream').events('mousedown');
  const release$ = Rx.Observable.fromEvent(document.body, 'mouseup');

  const dragging$ = Rx.Observable.merge(
    click$.map(_ => true),
    release$.map(_ => false)
  ).startWith(false);

  const playingClick$ = timeTravelDOM.select('.pause').events('click')
    .scan((previous, _) => !previous, true)
    .startWith(true);

  const playing$ = Rx.Observable.combineLatest(
    dragging$,
    playingClick$,
    (dragging, playingClick) => {
      if (dragging) {
        return false;
      }

      return playingClick;
    });

  const timeTravelPosition$ = makeTimeTravelPosition$(mousePosition$, dragging$);

  // TODO - use requestAnimationFrame scheduler
  const time$ = Rx.Observable.combineLatest(
      Rx.Observable.interval(16),
      playing$,
      (_, playing) => (playing)
    ).scan((oldTime, playing) => {
      const actualTime = getCurrentTime();

      if (playing) {
        const deltaTime = actualTime - oldTime.actualTime;
        return {appTime: oldTime.appTime + deltaTime, actualTime};
      }

      return {appTime: oldTime.appTime, actualTime};
    }, {appTime: 0, actualTime: getCurrentTime()})
    .map(time => time.appTime)
    .withLatestFrom(timeTravelPosition$, (time, timeTravel) => time - timeTravel)
    .startWith(0);

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
