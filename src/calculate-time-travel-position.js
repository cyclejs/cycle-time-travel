const {Rx} = require('@cycle/core');

function calculateTimestamp (mouseX) {
  return mouseX / document.documentElement.clientWidth * 10000;
}

function calculateTimeTravelPosition (previousState, newState) {
  let timeTravelDelta = 0;

  if (newState.dragging) {
    timeTravelDelta = calculateTimestamp(
      newState.mousePosition.x - previousState.mousePosition.x
    );
  }

  return {
    ...newState,
    timeTravelPosition: previousState.timeTravelPosition + timeTravelDelta
  };
}

function makeTimeTravelPosition$ (mousePosition$, dragging$) {
  const initialState = {
    timeTravelPosition: 0,
    mousePosition: 0,
    dragging: false
  };

  const currentPositionAndDragState$ = Rx.Observable.combineLatest(
    mousePosition$,
    dragging$,
    (mousePosition, dragging) => ({ mousePosition, dragging })
  );

  return currentPositionAndDragState$
    .scan(calculateTimeTravelPosition, initialState)
    .map(state => state.timeTravelPosition)
    .startWith(0);
}

module.exports = makeTimeTravelPosition$;
