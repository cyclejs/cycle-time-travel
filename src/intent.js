const {Rx} = require('@cycle/core');
const makeTimeTravelPosition$ = require('./calculate-time-travel-position');

function getMousePosition (ev) {
  return {
    x: ev.clientX,
    y: ev.clientY
  };
}

function intent (DOM) {
  const mousePosition$ = DOM.select('.stream').events('mousemove')
    .map(getMousePosition)
    .startWith({x: 0, y: 0});

  const click$ = DOM.select('.stream').events('mousedown');
  const release$ = Rx.Observable.fromEvent(document.body, 'mouseup');

  const dragging$ = Rx.Observable.merge(
    click$.map(_ => true),
    release$.map(_ => false)
  ).startWith(false);

  const playingClick$ = DOM.select('.pause').events('click')
    .scan((previous, _) => !previous, true)
    .startWith(true);

  const playing$ = Rx.Observable.combineLatest(
    dragging$,
    playingClick$,
    (dragging, playingClick) => {
      if (dragging) {
        return false;
      }

      return playingClick;
    });

  const timeTravelPosition$ = makeTimeTravelPosition$(mousePosition$, dragging$);

  return {
    timeTravelPosition$,
    playing$
  };
}

module.exports = intent;
