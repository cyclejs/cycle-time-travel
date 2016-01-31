/* global describe, it */
const assert = require('assert');
const $ = require('jquery');

const {run} = require('@cycle/core');
const {h, makeDOMDriver} = require('@cycle/dom');
const {Observable} = require('rx');

const TimeTravel = require('../src/time-travel');

const simulant = require('simulant');

function MouseEvent(type, dict) {
  var e = document.createEvent("MouseEvents");

  dict = dict || {};

  let bubbles = false;
  let catchable = false;

  // This is deprecated, but lol phantom mmk https://github.com/ariya/phantomjs/issues/11289
  e.initMouseEvent(type, bubbles, catchable, window, 0, dict.clientX, dict.clientY, dict.clientX, dict.clientY);

  e.clientX = dict.clientX;
  e.clientY = dict.clientY;

  return e;
}

function createRenderTarget () {
  const element = document.createElement('div');
  element.className = 'cycletest';
  document.body.appendChild(element);
  return element;
}

describe('TimeTravel', () => {
  it('can be paused', (done) => {
    function pauseMain ({DOM}) {
      return {DOM: Observable.just(1).map(n => h('.count', n))};
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

  it('time travels', (done) => {
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
      console.log('begin');
      $(renderTarget).find('.increment').trigger('click');
      setTimeout(() => {
        $(renderTarget).find('.increment').trigger('click');

        assert.equal($(renderTarget).find('.count').text(), 'Count: 2');

        $('.pause').trigger('click');

        $('.stream').trigger('mousedown');

        const streams = document.querySelectorAll('.stream');
        const lastStream = streams[streams.length - 1];

        simulant.fire(lastStream, 'mousemove', {clientX: 800, clientY: 0});

        simulant.fire(lastStream, 'mousedown');
        simulant.fire(lastStream, 'mousemove', {clientX: 820, clientY: 0});

        setTimeout(() => {
          assert.equal($(renderTarget).find('.count').text(), 'Count: 1');

          done();
        }, 400)
      }, 1400);
    }, 1);
  });
});
