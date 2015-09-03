const {Rx} = require('@cycle/core');

function timeTravelStreams (streams, time$) {
  const timeTravel = {};

  streams.forEach((recordedStream, index) => {
    timeTravel[streams[index].label] = Rx.Observable.combineLatest(
        time$,
        recordedStream,
        (time, events) => (events.slice(0)
          .reverse().find(val => val.timestamp <= time) ||
          events[events.length - 1])
      )
      .filter(thing => thing !== undefined && thing.value !== undefined)
      .map(v => v.value)
      .distinctUntilChanged();
  });

  return timeTravel;
}

module.exports = timeTravelStreams;
