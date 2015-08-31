const {Rx, run} = require('@cycle/core');
const {h, makeDOMDriver} = require('@cycle/dom');
const logStreams = require('../src/time-travel');

require('babel/register');

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
  return DOM.select('.increment').events('click);
}

function main ({DOM}) {
  const userIntent = intent(DOM);
  const count$ = model(userIntent);

  const logStream = logStreams(DOM, [
    {stream: count$, label: 'count$'}
  ]);

  const app = view(logStream.timeTravel.count$);

  return {
    DOM: Rx.Observable.combineLatest(app, logStream.DOM)
      .map(vtrees => (
        h('.app', vtrees)
      )
    )
  };
}

const drivers = {
  DOM: makeDOMDriver('.cycle')
};

run(main, drivers);

