/* global describe, it */
const assert = require('assert');
const $ = require('jquery');

const {run, Rx} = require('@cycle/core');
const {h, makeDOMDriver} = require('@cycle/dom');

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

  it('can be paused', (done) => {
    function main ({DOM}) {
      const count$ = DOM.select('.count').events('click');
      const timeTravel = TimeTravel(DOM, [
        {stream: count$, label: 'count$'}
      ]);

      return {DOM: timeTravel.DOM};
    }

    const renderTarget = createRenderTarget();
    run(main, {DOM: makeDOMDriver(renderTarget)});

    // TODO - do this by subscribing to responses instead
    setTimeout(() => {
      $(renderTarget).find('.pause').trigger('click');

      assert.equal($(renderTarget).find('.pause').text(), 'Play');

      $(renderTarget).find('.pause').trigger('click');

      assert.equal($(renderTarget).find('.pause').text(), 'Pause');

      done();
    }, 1);
  });

  it('plays the app as normal', (done) => {
    function main ({DOM}) {
      const count$ = DOM.select('.increment').events('click')
        .scan((count, _) => count + 1, 0)
        .startWith(0);

      const timeTravel = TimeTravel(DOM, [
        {stream: count$, label: 'count$'}
      ]);

      const vtree$ = count$.map(count => (
        h('.app', [
          h('button.increment', 'Increment'),
          h('.count', `Count: ${count}`)
        ])
      ));

      return {
        DOM: Rx.Observable.combineLatest(vtree$, timeTravel.DOM)
          .map(vtrees => h('.test', vtrees))
      };
    }

    const renderTarget = createRenderTarget();
    run(main, {DOM: makeDOMDriver(renderTarget)});

    setTimeout(() => {
      assert.equal($(renderTarget).find('.count').text(), 'Count: 0');

      $(renderTarget).find('.increment').trigger('click');

      assert.equal($(renderTarget).find('.count').text(), 'Count: 1');

      done();
    }, 1);
  });
});
