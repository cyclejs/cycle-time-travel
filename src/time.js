const {Rx} = require('@cycle/core');

function getCurrentTime () {
  return new Date().getTime();
}

function makeTime$ (playing$, timeTravelPosition$) {
  // TODO - use requestAnimationFrame scheduler
  return Rx.Observable.combineLatest(
      Rx.Observable.interval(16),
      playing$,
      (_, playing) => (playing)
    ).scan((oldTime, playing) => {
      const actualTime = getCurrentTime();

      if (playing) {
        const deltaTime = actualTime - oldTime.actualTime;
        return {appTime: oldTime.appTime + deltaTime, actualTime};
      }

      return {appTime: oldTime.appTime, actualTime};
    }, {appTime: 0, actualTime: getCurrentTime()})
    .map(time => time.appTime)
    .withLatestFrom(timeTravelPosition$, (time, timeTravel) => time - timeTravel)
    .startWith(0);
}

module.exports = makeTime$;
