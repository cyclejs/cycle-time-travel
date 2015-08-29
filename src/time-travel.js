const {Rx} = require('@cycle/core');
const {h} = require('@cycle/dom');

require('babel/register');

function getCurrentTime () {
  if (window.appStartTime === undefined) {
    window.appStartTime = new Date().getTime();
  }

  return new Date().getTime();
}

function calculateValuePosition (startPercentage, currentTime, streamValue) {
  const occurrenceTimeAgoInMs = currentTime - streamValue.timestamp;

  return (startPercentage - (occurrenceTimeAgoInMs / 5000) * startPercentage);
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

function calculateTimestamp (time, mouseX) {
  return mouseX / document.documentElement.clientWidth * 5000;
}

function logStreams (DOM, streams) {
  const timeTravel = {};

  const playing$ = DOM.get('.pause', 'click')
    .scan((previous, _) => !previous, true)
    .startWith(true);

  const mousePosition$ = DOM.get('.stream', 'mousemove')
    .map(getMousePosition)
    .startWith({x: 0, y: 0});

  const click$ = DOM.get('.stream', 'mousedown');
  const release$ = Rx.Observable.fromEvent(document.body, 'mouseup');

  const dragging$ = Rx.Observable.merge(
    click$.map(_ => true),
    release$.map(_ => false)
  ).startWith(false);

  const timeTravelPosition$ = mousePosition$
    .map(mousePosition => calculateTimestamp(mousePosition.x))
    .withLatestFrom(dragging$, (timeTravel, dragging) => {
      if (dragging) {
        return timeTravel;
      }

      return 0;
    });

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
    .startWith(0);

  const wowSuchCurrentTime$ = time$
    .withLatestFrom(dragging$, timeTravelPosition$, (time, dragging, timeTravelPosition) => {
      if (dragging) {
        return timeTravelPosition;
      }

      return time;
    }).startWith(0);

  const loggedStreams = streams.map(streamInfo => {
    return streamInfo.stream
      .withLatestFrom(time$, (ev, time) => ({
        timestamp: time, value: ev
      }))
      .startWith([])
      .scan((events, newEvent) => {
        const newEvents = events.concat([newEvent]);

        newEvents.label = streamInfo.label;

        return newEvents;
      }
    );
  });

  loggedStreams.forEach((loggedStream, index) => {
    timeTravel[streams[index].label] = wowSuchCurrentTime$
      .withLatestFrom(loggedStream, (time, events) => ({events, time}))
      .map(({time, events}) => {
        return events.slice(0).reverse().find(val => val.timestamp < time) || events[events.length - 1];
      })
      .filter(thing => thing.value !== undefined)
      .map(v => v.value);
  });

  return {
    DOM: Rx.Observable.combineLatest(wowSuchCurrentTime$, playing$, ...loggedStreams,
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
