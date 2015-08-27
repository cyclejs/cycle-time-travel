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

function logStreams (streams) {
  const loggedStreams = streams.map(stream => {
    return stream
      .startWith([])
      .scan((events, newEvent) => {
        return events.concat([
          {occurredAt: new Date().getTime(), ...newEvent}
        ]);
      });
  });

  return {
    DOM: Rx.Observable.combineLatest.apply(null, loggedStreams)
      .map(streamValues => (
        streamValues.map(values => (
          h('.stream', JSON.stringify(values))
        ))
      )
    )
  };
}

function main ({DOM}) {
  const userIntent = intent(DOM);

  const streamLogs = logStreams([userIntent]);
  const app = view(model(userIntent));

  return {
    DOM: Rx.Observable.combineLatest(app, streamLogs.DOM)
      .map(vtrees => (
        h('.app', vtrees)
      )
    )
  };
}

run(main, drivers);

