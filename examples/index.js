const {Rx, run} = require('@cycle/core');
const {h, makeDOMDriver} = require('@cycle/dom');
const logStreams = require('../src/time-travel');

require('babel/register');

function view (count$) {
  return count$
    .map((count) => (
      h('.widget', [
        h('span.count', `Count: ${count}`),
        h('button.increment', 'Increment'),
        h('button.decrement', 'Decrement')
      ])
    )
  );
}

function model ({increment$, decrement$}) {
  const action$ = Rx.Observable.merge(
    increment$.map(_ => +1),
    decrement$.map(_ => -1)
  );

  const count$ = action$.scan((count, value) => count + value)
    .startWith(0);

  return {count$, action$};
}

function intent (DOM) {
  return {
    increment$: DOM.select('.increment').events('click'),
    decrement$: DOM.select('.decrement').events('click')
  };
}

function main ({DOM}) {
  const userIntent = intent(DOM);
  const {count$, action$} = model(userIntent);

  const logStream = logStreams(DOM, [
    {stream: count$, label: 'count$'},
    {stream: action$, label: 'action$'}
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

