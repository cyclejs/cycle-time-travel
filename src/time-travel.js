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
      h('.stream-marker', {style: {left: '72%'}}),
      ...streamValues.map(renderStreamValue.bind(null, currentTime))
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
  return time - (mouseX / document.documentElement.clientWidth) * 5000;
}

function logStreams (DOM, streams) {
  const timeTravel = {};

  const playing$ = DOM.get('.pause', 'click')
    .scan((previous, _) => !previous, true)
    .startWith(true);

  const mousePosition$ = DOM.get('.time-travel', 'mousemove')
    .map(getMousePosition)
    .startWith({x: 0, y: 0});

  const click$ = DOM.get('.time-travel', 'mousedown');
  const release$ = Rx.Observable.fromEvent(document.body, 'mouseup');

  const dragging$ = Rx.Observable.merge(
    click$.map(_ => true),
    release$.map(_ => false)
  ).startWith(false);

  const time$ = Rx.Observable.combineLatest(
      Rx.Observable.interval(16),
      playing$,
      (_, playing) => ({realTime: getCurrentTime(), playing})
    ).scan((oldTime, currentTime) => {

      const pauseOffset = currentTime.realTime - oldTime.realTime;

      if (currentTime.playing) {
        if (oldTime.playing) {
          return {
            ...currentTime,
            time: currentTime.realTime - oldTime.pauseOffset,
            pauseOffset: oldTime.pauseOffset
          };
        }

        return {
          ...currentTime,
          pauseOffset: oldTime.pauseOffset,
          time: currentTime.realTime - oldTime.pauseOffset
        };
      }

      return {
        ...oldTime,
        pauseOffset,
        playing: false
      };
    }, {realTime: getCurrentTime(), pauseOffset: 0, playing: true})
    .map(currentTime => currentTime.time)
    .startWith(getCurrentTime());

  const timeTravelPosition$ = mousePosition$
    .withLatestFrom(time$, (mousePosition, time) => {
      return calculateTimestamp(time, mousePosition.x);
    });

  const wowSuchCurrentTime$ = time$
    .withLatestFrom(dragging$, timeTravelPosition$, (time, dragging, timeTravelPosition) => {
      if (dragging) {
        return timeTravelPosition;
      }

      return time;
    }).startWith(getCurrentTime());

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
