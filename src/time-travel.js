require('es6-shim');

const {Rx} = require('@cycle/core');
const {h} = require('@cycle/dom');

function getCurrentTime () {
  if (window.appStartTime === undefined) {
    window.appStartTime = new Date().getTime();
  }

  return new Date().getTime();
}

function calculateValuePosition (startPercentage, currentTime, streamValue) {
  const occurrenceTimeAgoInMs = currentTime - streamValue.timestamp;

  return (startPercentage - (occurrenceTimeAgoInMs / 10000) * startPercentage);
}

function renderStreamValue (currentTime, streamValue) {
  const left = calculateValuePosition(70, currentTime, streamValue);

  if (left < -10) {
    return null;
  }

  return (
    h('.stream-value', {style: {left: left + '%'}}, JSON.stringify(streamValue.value))
  );
}

function renderStream (currentTime, streamValues) {
  return (
    h('.stream', [
      h('.stream-title', streamValues.label),
      ...streamValues.map(renderStreamValue.bind(null, currentTime)),
      h('.stream-marker', {style: {left: '72%'}})
    ])
  );
}

function getMousePosition (ev) {
  return {
    x: ev.clientX,
    y: ev.clientY
  };
}

function calculateTimestamp (mouseX) {
  return mouseX / document.documentElement.clientWidth * 10000;
}

function logStreams (DOM, streams) {
  const timeTravel = {};

  const mousePosition$ = DOM.get('.stream', 'mousemove')
    .map(getMousePosition)
    .startWith({x: 0, y: 0});

  const click$ = DOM.get('.stream', 'mousedown');
  const release$ = Rx.Observable.fromEvent(document.body, 'mouseup');

  const dragging$ = Rx.Observable.merge(
    click$.map(_ => true),
    release$.map(_ => false)
  ).startWith(false);

  const playingClick$ = DOM.get('.pause', 'click')
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

  const timeTravelPosition$ = Rx.Observable.combineLatest(
    mousePosition$,
    dragging$,
    (mousePosition, dragging) => ({
      mousePosition,
      dragging
    })
  ).scan((previousState, newState) => {
    let timeTravelDelta = 0;

    if (newState.dragging) {
      timeTravelDelta = calculateTimestamp(newState.mousePosition.x - previousState.mousePosition.x);
    }

    return {
      ...newState,
      timeTravelPosition: previousState.timeTravelPosition + timeTravelDelta
    };
  }, {timeTravelPosition: 0, mousePosition: 0, dragging: false})
    .map(state => state.timeTravelPosition)
    .startWith(0);

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
        return h('.time-travel', [
          h('button.pause', playing ? 'Pause' : 'Play'),
          ...streamValues.map(renderStream.bind(null, currentTime))
        ]);
      }
    ),

    timeTravel
  };
}

module.exports = logStreams;
