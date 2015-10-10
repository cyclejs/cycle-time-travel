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
  const countChange$ = Rx.Observable.merge(
    increment$.map(_ => +1),
    decrement$.map(_ => -1)
  );

  return countChange$
    .scan((count, change) => count + change)
    .startWith(0);
}

function intent (DOM) {
  return {
    increment$: DOM.select('.increment').events('click'),
    decrement$: DOM.select('.decrement').events('click')
  };
}

function main ({DOM}) {
  return {
    DOM: view(model(intent(DOM)))
  };
}

const drivers = {
  DOM: makeDOMDriver('.cycle')
};

TimeTravel.run(main, drivers);
