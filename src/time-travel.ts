import {setup as originalRun} from '@cycle/run';
import xs from 'xstream';
import {timeDriver} from '@cycle/time';
import {makeDOMDriver, div, pre} from '@cycle/dom';
import sampleCombine from 'xstream/extra/sampleCombine';

// First of all, let's use Time to display a graph of goodness
//
function streamGraph (sinks) {
  return Object.keys(sinks).map(key =>
    flatten(walkStreamGraph(sinks[key]))
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
  'border': '1px solid #CCC',
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

function renderEntry (time, entry) {
  const timeAgo = time.time - entry.time;
  const right = `${timeAgo / 10}px`;

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

function renderLog (time, log) {
  return (
    div('.log', {style: logStyle}, log.map(entry => renderEntry(time, entry)))
  );
}

const logsStyle = {
  'position': 'absolute',
  'bottom': '0px',
  'left': '0px',
  'width': '100vw',
  'display': 'flex',
  'flex-direction': 'column'
};

function renderRecordedStreams (Time, streams) {
  const time$ = Time.animationFrames();

  return time$.compose(sampleCombine(streams)).map(([time, logs]) => {
    return (
      div('.logs', {style: logsStyle}, logs.map(log => renderLog(time, log)))
    );
  });
}

function run (app, drivers) {
  const Time = timeDriver(null, null);

  drivers.Time = () => Time;

  const stuff = originalRun(app, drivers);

  const awesomeStreams = streamGraph(stuff.sinks);

  function InnerApp () {
    const allTheStreams = xs.combine(...awesomeStreams[0].map(Time.record))

    return {
      DOM: renderRecordedStreams(Time, allTheStreams)
    }
  }

  const innerDrivers = {
    DOM: makeDOMDriver('.tools')
  }

  originalRun(InnerApp, innerDrivers).run();

  stuff.run();
}

export {
  run
};
