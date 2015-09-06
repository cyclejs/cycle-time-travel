/* global describe, it */
const assert = require('assert');

const {run, Rx} = require('@cycle/core');
const {makeDOMDriver} = require('@cycle/dom');

const TimeTravel = require('../src/time-travel');

function createRenderTarget () {
  const element = document.createElement('div');
  element.className = 'cycletest';
  document.body.appendChild(element);
  return element;
}

describe('TimeTravel', () => {
  it('can be created', () => {
    function main ({DOM}) {
      const timeTravel = TimeTravel(DOM, []);

      return {DOM: timeTravel.DOM};
    }

    assert.doesNotThrow(() => {
      run(main, {DOM: makeDOMDriver(createRenderTarget())});
    });
  });

  it('takes streams to control', () => {
    function main ({DOM}) {
      const count$ = DOM.select('.count').events('click');
      const timeTravel = TimeTravel(DOM, [
        {stream: count$, label: 'count$'}
      ]);

      return {DOM: timeTravel.DOM};
    }

    assert.doesNotThrow(() => {
      run(main, {DOM: makeDOMDriver(createRenderTarget())});
    });
  });
});
