const {h} = require('@cycle/dom');

function calculateValuePosition (startPercentage, currentTime, streamValue) {
  const occurrenceTimeAgoInMs = currentTime - streamValue.timestamp;

  return (startPercentage - (occurrenceTimeAgoInMs / 10000) * startPercentage);
}

function renderStreamValue (currentTime, streamValue) {
  const left = calculateValuePosition(70, currentTime, streamValue);

  if (left < -100) {
    return null;
  }

  return (
    h('.stream-value', {style: {left: left + '%'}}, JSON.stringify(streamValue.value))
  );
}

function renderStream (currentTime, streamValues) {
  return (
    h('.stream', [
      h('.stream-title', streamValues.label),
      ...streamValues.map(renderStreamValue.bind(null, currentTime)),
      h('.stream-marker', {style: {left: '72%'}})
    ])
  );
}

function renderStreams (currentTime, ...streamValues) {
  return h('.streams', streamValues.map(streamValueSet =>
    renderStream(currentTime, streamValueSet)
  ));
}

module.exports = renderStreams;
