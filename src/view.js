const {Observable} = require('rx');
const {h} = require('@cycle/dom');

const renderStreams = require('./render-streams');
const stylesheet = require('./style');

function timeTravelBarView (name, time$, playing$, recordedStreams$) {
  console.log(recordedStreams$);
  return Observable.combineLatest(time$, playing$, recordedStreams$.flatMapLatest(Observable.combineLatest),
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

