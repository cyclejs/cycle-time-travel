const {Rx, run} = require('@cycle/core');
const {h, makeDOMDriver} = require('@cycle/dom');
const TimeTravel = require('../src/time-travel');

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

  const app = view(count$);

  return {
    DOM: app
  };
}

const drivers = {
  DOM: makeDOMDriver('.cycle')
};

TimeTravel.run(main, drivers);
