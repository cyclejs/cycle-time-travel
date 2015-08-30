const {h} = require('@cycle/dom');

const styles = require('./style');

function calculateValuePosition (startPercentage, currentTime, streamValue) {
  const occurrenceTimeAgoInMs = currentTime - streamValue.timestamp;

  return (startPercentage - (occurrenceTimeAgoInMs / 10000) * startPercentage);
}

function renderStreamValue (currentTime, streamValue) {
  const left = calculateValuePosition(70, currentTime, streamValue);

  if (left < -100) {
    return null;
  }

  const inlineStyles = styles('.stream-value');

  const style = {
    ...inlineStyles,
    left: left + '%'
  }

  return (
    h('.stream-value',
      {style},
      JSON.stringify(streamValue.value)
    )
  );
}

function renderStream (currentTime, streamValues, even) {
  const style = {
    ...styles('.stream'),
    background: even ? '#D9D9D9' : '#C2C2C2'
  }

  return (
    h('.stream', {style}, [
      h('.stream-title', {style: styles('.stream-title')}, streamValues.label),
      ...streamValues.map(renderStreamValue.bind(null, currentTime)),
      h('.stream-marker', {style: styles('.stream-marker')})
    ])
  );
}

function renderStreams (currentTime, ...streamValues) {
  return h('.streams', streamValues.map((streamValueSet, index) =>
    renderStream(currentTime, streamValueSet, index % 2 == 0)
  ));
}

module.exports = renderStreams;
