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
      h('p', `Count: ${count}`)
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
  return DOM.get('p', 'click');
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

function logStreams (DOM, streams) {
  const playing$ = DOM.get('.pause', 'click')
    .scan((previous, _) => !previous, true)
    .startWith(true);

  const loggedStreams = streams.map(streamInfo => {
    return streamInfo.stream
      .startWith([])
      .pausable(playing$)
      .timestamp()
      .scan((events, newEvent) => {
        const newEvents = events.concat([newEvent]);

        newEvents.label = streamInfo.label;

        return newEvents;
      }, []
    );
  });

  const time = Rx.Observable.interval(16).map(getCurrentTime)
    .startWith(getCurrentTime()).pausable(playing$);

  return {
    DOM: Rx.Observable.combineLatest(...loggedStreams, time, playing$)
      .map((things) => {
        const streamValues = things.slice(0, things.length - 2);
        const currentTime = things[things.length - 2];
        const playing = things[things.length - 1];

        return h('.time-travel', [
          h('button.pause', playing ? 'Pause' : 'Play'),
          ...streamValues.map(renderStream.bind(null, currentTime))
        ]);
      }
    )
  };
}

function main ({DOM}) {
  const userIntent = intent(DOM);
  const count$ = model(userIntent);

  const streamLogs = logStreams(DOM, [
    {stream: count$, label: 'count'},
    {stream: count$.debounce(600), label: 'count.debounce(600ms)'},
    {stream: count$.sample(600), label: 'count.sample(600ms)'}
  ]);
  const app = view(count$);

  return {
    DOM: Rx.Observable.combineLatest(app, streamLogs.DOM)
      .map(vtrees => (
        h('.app', vtrees)
      )
    )
  };
}

run(main, drivers);

