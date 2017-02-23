import {run} from '../src/time-travel';
import {makeDOMDriver, div, span, button} from '@cycle/dom';
import {timeDriver} from '@cycle/time';
import xs, {Stream} from 'xstream';
import {restartable} from 'cycle-restart'

function renderCounter (count) {
  return (
    div('.counter', [
      span('.count', `Count: ${count}`),
      button('.increment', 'Increment'),
      button('.decrement', 'Decrement')
    ])
  )
}

function model ({increment$, decrement$}) {
  const action$ = xs.merge(
    increment$.mapTo(+1),
    decrement$.mapTo(-1)
  ) as Stream<number>;

  const count$ = action$.fold((count, value) => count + value, 0);

  return count$;
}

function intent (DOM) {
  return {
    increment$: DOM.select('.increment').events('click'),
    decrement$: DOM.select('.decrement').events('click')
  };
}

function main ({DOM}) {
  return {
    DOM: model(intent(DOM)).map(renderCounter)
  };
}

const makeDrivers = () => ({
  DOM: restartable(makeDOMDriver('.cycle'), {pauseSinksWhileReplaying: false}),
  Time: timeDriver
});

run(main, makeDrivers);

