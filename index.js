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
  const occurrenceTimeAgoInMs = currentTime - streamValue.occurredAt;

  return (100 - (occurrenceTimeAgoInMs / 50));
}

function renderStreamValue (currentTime, streamValue) {
  const left = calculateValuePosition(currentTime, streamValue);

  return (
    h('.stream-value', {style: {left: left + '%'}}, JSON.stringify(streamValue.value))
  );
}

function renderStream (currentTime, streamValues) {
  return (
    h('.stream',
      streamValues.map(renderStreamValue.bind(null, currentTime))
    )
  );
}

function logStreams (streams) {
  const loggedStreams = streams.map(stream => {
    return stream
      .startWith([])
      .scan((events, newEvent) => {
        return events.concat([
          {occurredAt: getCurrentTime(), value: newEvent}
        ]);
      });
  });

  const time = Rx.Observable.interval(16).map(getCurrentTime)
    .startWith(getCurrentTime());

  return {
    DOM: Rx.Observable.combineLatest(...loggedStreams, time)
      .map((things) => {
        const streamValues = things.slice(0, things.length - 1);
        const currentTime = things[things.length - 1];
        return h('.time-travel', streamValues.map(renderStream.bind(null, currentTime)));
      }
    )
  };
}

function main ({DOM}) {
  const userIntent = intent(DOM);
  const count$ = model(userIntent);

  const streamLogs = logStreams([count$]);
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

