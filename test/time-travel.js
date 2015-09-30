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
  it('can be paused', (done) => {
    function pauseMain ({DOM}) {
      return {DOM: Rx.Observable.just(1).map(n => h('.count', n))};
    }

    const renderTarget = createRenderTarget();
    TimeTravel.run(pauseMain, {DOM: makeDOMDriver(renderTarget)});

    // TODO - do this by subscribing to responses instead
    setTimeout(() => {
      $('.pause').trigger('click');

      assert.equal($('.pause').text(), 'Play');

      $('.pause').trigger('click');

      assert.equal($('.pause').text(), 'Pause');

      done();
    }, 1);
  });

  it('plays the app as normal', (done) => {
    function main ({DOM}) {
      const count$ = DOM.select('.increment').events('click')
        .scan((count, _) => count + 1, 0)
        .startWith(0);

      const vtree$ = count$.map(count => (
        h('.app', [
          h('button.increment', 'Increment'),
          h('.count', `Count: ${count}`)
        ])
      ));

      return {
        DOM: vtree$
      };
    }

    const renderTarget = createRenderTarget();
    TimeTravel.run(main, {DOM: makeDOMDriver(renderTarget)});

    setTimeout(() => {
      assert.equal($(renderTarget).find('.count').text(), 'Count: 0');

      $(renderTarget).find('.increment').trigger('click');

      assert.equal($(renderTarget).find('.count').text(), 'Count: 1');

      done();
    }, 1);
  });
});
