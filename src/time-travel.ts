import {setup as originalRun} from '@cycle/run';
import xs, {Stream} from 'xstream';
import {timeDriver} from '@cycle/time';
import {makeDOMDriver, div, pre, button} from '@cycle/dom';
import sampleCombine from 'xstream/extra/sampleCombine';
import concat from 'xstream/extra/concat';

function delta (stream: Stream<number>): Stream<number> {
  const state = {
    lastValue: null,
    delta: 0
  }

  function calculateDelta ({lastValue, delta}, value) {
    if (lastValue === null) {
      return {
        lastValue: value,
        delta
      }
    }
    return {
      lastValue: value,
      delta: value - lastValue
    }
  }

  return stream.fold(calculateDelta, state).drop(1).map(state => state.delta);
}
// First of all, let's use Time to display a graph of goodness
function streamGraph (sinks) {
  return Object.keys(sinks).map(key =>
    flatten(walkStreamGraph(sinks[key])).reverse()
  );
}

function flatten (arr) {
  if (typeof arr.reduce !== 'function') {
    return arr;
  }

  return arr.reduce((acc, val) => acc.concat(flatten(val)), []);
}

function walkStreamGraph (stream) {
  if (!stream) {
    return [];
  }

  const producer = stream._prod;
  const ins = producer.insArray || [producer.ins];
  // TODO s/insArray/insArr and prevent walkStreamGraph from walking into driver

  return [stream].concat(ins.map(walkStreamGraph));
}

const entryStyle = {
  'position': 'absolute',
  'width': '20px',
  'height': '20px',
  'top': '4px',
  'font-family': 'sans-serif',
  'border-radius': '15px',
  'background': '#DDD',
  'border': '1px solid #999',
  'text-align': 'center'
}

function displayEntry (entry) {
  if (typeof entry.value === 'number' || typeof entry.value === 'string') {
    return entry.value;
  }

  if (typeof entry.value === 'object') {
    return '{}'
  }

  return typeof entry.value;
}

function renderEntry (time, offsetTime, entry) {
  const timeAgo = time.time - (offsetTime * 10) - entry.time;
  const right = `${(timeAgo + 800) / 10}px`;

  return (
    div(
      '.entry',
      {style: {...entryStyle, right}},
      displayEntry(entry)
    )
  );
}

const logStyle = {
  'position': 'relative',
  'height': '30px',
  'background': '#333',
  'border-top': '1px solid #AAA'
}

function renderLog (time, offsetTime, log) {
  return (
    div('.log', {style: logStyle}, log.map(entry => renderEntry(time, offsetTime, entry)))
  );
}

const nowMarkerStyle = {
  'position': 'absolute',
  'height': '100%',
  'width': '1px',
  'background': 'darkred',
  'right': '11%',
  'z-index': '10'
}

function renderNowMarker () {
  return (
    div('.now-marker', {style: nowMarkerStyle})
  )
}

const logsStyle = {
  'position': 'relative',
  'display': 'flex',
  'flex-direction': 'column'
};

const timeTravelStyle = {
  'position': 'absolute',
  'bottom': '0px',
  'left': '0px',
  'width': '100vw',
}

function renderRecordedStreams (Time, streams, playing$, offsetTime$) {
  const time$ = Time.animationFrames();

  return xs.combine(time$, streams, playing$, offsetTime$).map(([time, logs, playing, offsetTime]) => {
    return (
      div('.time-travel', {style: timeTravelStyle}, [
        button('.pause', playing ? 'Pause' : 'Play'),
        div('.logs', {style: logsStyle}, [
          renderNowMarker(),
          ...(logs as Array<any>).map(log => renderLog(time, offsetTime, log))
        ])
      ])
    );
  });
}

function run (app, drivers) {
  const Time = timeDriver(null, null);

  drivers.Time = () => Time;

  const stuff = originalRun(app, drivers);

  const awesomeStreams = streamGraph(stuff.sinks);

  function InnerApp (sources) {
    const allTheStreams = xs.combine(...awesomeStreams[0].map(Time.record))

    let time = 0;

    const togglePlaying$ = sources.DOM
      .select('.pause')
      .events('click')
      .mapTo(playing => !playing);

    const pauseByBarMousedown$ = sources.DOM
      .select('.logs')
      .events('mousedown')

    const mouseUp$ = sources.DOM
      .select('document')
      .events('mouseup');

    const mouseMove$ = sources.DOM
      .select('document')
      .events('mousemove');

    const changeTime$ = pauseByBarMousedown$
      .map(() =>
        mouseMove$.map(ev => ev.clientX)
          .compose(delta)
          .fold((acc, val) => acc + val, 0)
          .endWhen(mouseUp$)
      )

    const offsetTime$ = changeTime$
      .map(stream => concat(stream, xs.of(0)))
      .flatten()
      .startWith(0);

    const doTheThing$ = pauseByBarMousedown$.map(() => {
        return concat(
          concat(xs.of((playing: boolean): boolean => false), xs.never()).endWhen(mouseUp$),
          xs.of((playing: boolean): boolean => true)
        )
      }
    ).flatten();

    const playingReducer$ = xs.merge(
      togglePlaying$,
      doTheThing$
    );

    const playing$ = playingReducer$.fold((playing, reducer: (playing: boolean) => boolean) => reducer(playing), true)
      .debug(playing => {
        if (playing) {
          Time['_resume'](time);
        } else {
          Time['_pause']();
        }

        time = Time['_time']();
      });

    return {
      DOM: renderRecordedStreams(Time, allTheStreams, playing$, offsetTime$),
      ChangeTime: changeTime$.map(stream => stream.last()).flatten()
    }
  }

  const innerDrivers = {
    DOM: makeDOMDriver('.tools'),
    ChangeTime: (stream) => {
      stream.addListener({
        next (ev) {
          console.log(ev);
        }
      });
    }
  }

  originalRun(InnerApp, innerDrivers).run();

  stuff.run();
}

export {
  run
};
