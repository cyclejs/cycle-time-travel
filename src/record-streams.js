function recordStream (streamInfo, time$) {
  const recordedStream = streamInfo.stream
    .withLatestFrom(time$, (ev, time) => ({
      timestamp: time, value: ev
    }))
    .scan((events, newEvent) => {
      const newEvents = events.concat([newEvent]);

      newEvents.label = streamInfo.label;
      newEvents.options = {feature: streamInfo.feature || false};

      return newEvents;
    }, []
  ).share().startWith([]);

  recordedStream.label = streamInfo.label;

  return recordedStream;
}

function recordStreams (streams, time$) {
  return streams.map(streamInfo => recordStream(streamInfo, time$));
}

module.exports = recordStreams;
