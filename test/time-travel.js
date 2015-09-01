const test = require('tape');
const {Rx} = require('@cycle/core');
const {makeDOMDriver} = require('@cycle/dom');

const TimeTravel = require('../src/time-travel');

test('you can create an instance of TimeTravel', (t) => {
  t.plan(1);

  const DOM = makeDOMDriver('.test');

  const timeTravel = TimeTravel(DOM, []);

  t.pass();
});
