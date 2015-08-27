const {Rx, run} = require('@cycle/core');
const {h, makeDOMDriver} = require('@cycle/dom');

function log (label) {
  return (thing) => {
    console.log(label, thing);
    return thing;
  };
}

const drivers = {
  DOM: makeDOMDriver('.cycle')
};

function view (count$) {
  return count$
    .map((count) => (
      h('.widget', [
        h('span.count', `Count: ${count}`),
        h('button.increment', 'Increment')
      ])
    )
  );
}

function model (click$) {
  return click$
    .map(_ => 1)
    .scan((count, value) => count + value)
    .startWith(0);
}

function intent (DOM) {
  return DOM.get('.increment', 'click');
}

function getCurrentTime () {
  return new Date().getTime();
}

function calculateValuePosition (currentTime, streamValue) {
  const occurrenceTimeAgoInMs = currentTime - streamValue.timestamp;

  return (100 - (occurrenceTimeAgoInMs / 50));
}

function renderStreamValue (currentTime, streamValue) {
  const left = calculateValuePosition(currentTime, streamValue);

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

  const paused$ = playing$.map(playing => !playing);

  const mousePosition$ = DOM.get('.time-travel', 'mousemove')
    .map(getMousePosition);

  const click$ = DOM.get('.time-travel', 'click');

  const time$ = Rx.Observable.interval(16).map(getCurrentTime)
    .startWith(getCurrentTime());

  const timeTravelPosition$ = click$.map(log('click'))
    .withLatestFrom(mousePosition$, time$, (click, mousePosition, time) => {
      return calculateTimestamp(time, mousePosition.x);
    });

  const wowSuchCurrentTime$ = time$.pausable(playing$).merge(timeTravelPosition$);

  const loggedStreams = streams.map(streamInfo => {
    return streamInfo.stream
      .timestamp()
      .startWith([])
      .pausable(playing$)
      .scan((events, newEvent) => {
        const newEvents = events.concat([newEvent]);

        newEvents.label = streamInfo.label;

        return newEvents;
      }, []
    );
  });

  loggedStreams.forEach((loggedStream, index) => {
    timeTravel[streams[index].label] = loggedStream
      .withLatestFrom(wowSuchCurrentTime$, (values, time) => ({values, time}))
      .map(({values, time}) => (values.filter((value, index) => value.timeStamp < time || index === values.length - 1)))
      .filter(values => values[values.length - 1].value !== undefined)
      .map(log('I hope this updates'))
      .map(values => values[values.length - 1].value);
  });

  return {
    DOM: Rx.Observable.combineLatest(...loggedStreams, wowSuchCurrentTime$, playing$)
      .map((things) => {
        const streamValues = things.slice(0, things.length - 2);
        const currentTime = things[things.length - 2];
        const playing = things[things.length - 1];

        return h('.time-travel', [
          h('button.pause', playing ? 'Pause' : 'Play'),
          ...streamValues.map(renderStream.bind(null, currentTime))
        ]);
      }
    ),

    timeTravel
  };
}

function main ({DOM}) {
  const userIntent = intent(DOM);
  const count$ = model(userIntent);

  const streamLogs = logStreams(DOM, [
    {stream: count$, label: 'count$'},
    {stream: count$.debounce(600), label: 'count$.debounce(600ms)'},
    {stream: count$.sample(600), label: 'count$.sample(600ms)'},
    {stream: userIntent, label: 'click$'}
  ]);

  const app = view(model(streamLogs.timeTravel.click$));

  return {
    DOM: Rx.Observable.combineLatest(app, streamLogs.DOM)
      .map(vtrees => (
        h('.app', vtrees)
      )
    )
  };
}

run(main, drivers);

