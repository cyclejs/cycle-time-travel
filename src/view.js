const {Rx} = require('@cycle/core');
const {h} = require('@cycle/dom');

const renderStreams = require('./render-streams');
const stylesheet = require('./style');

function timeTravelBarView (name, time$, playing$, recordedStreams$) {
  return Rx.Observable.combineLatest(time$, playing$, recordedStreams$.flatMapLatest(Rx.Observable.combineLatest),
    (currentTime, playing, streamValues) => {
      return h(name, [
        stylesheet(),
        h('button.pause', playing ? 'Pause' : 'Play'),
        renderStreams(currentTime, ...streamValues)
      ]);
    }
  );
}

module.exports = timeTravelBarView;

