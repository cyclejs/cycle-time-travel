const {h} = require('@cycle/dom');

function calculateValuePosition (startPercentage, currentTime, streamValue) {
  const occurrenceTimeAgoInMs = currentTime - streamValue.timestamp;

  return (startPercentage - (occurrenceTimeAgoInMs / 10000) * startPercentage);
}

function renderFeatureValue (value) {
  if (!value) { return; }

  return value.map(val => (
    h('.subvalue', renderValue(val))
  ));
}

function renderValue (value) {
  if (typeof value === 'object' && 'subscribe' in value) {
    return '$';
  }

  try {
  return JSON.stringify(value, null, 0);
  } catch (e) {
    return 'E!' + e.message;
  }
}

function renderStreamValue (currentTime, feature, streamValue) {
  const left = calculateValuePosition(70, currentTime, streamValue);

  if (left < -100) {
    return null;
  }

  const valueRenderer = feature ? renderFeatureValue : renderValue;

  return (
    h('pre.stream-value',
      {style: {left: left + '%'}},
      valueRenderer(streamValue.value)
    )
  );
}

function renderStream (currentTime, streamValues, even) {
  let feature = '';

  if (streamValues.options && streamValues.options.feature) {
    feature = '.feature';
  }

  return (
    h(`.stream ${feature}`, [
      h('.stream-title', streamValues.label),
      ...streamValues.map(renderStreamValue.bind(null, currentTime, !!feature)),
      h('.stream-marker')
    ])
  );
}

function renderStreams (currentTime, ...streamValues) {
  return h('.streams', streamValues.map((streamValueSet, index) =>
    renderStream(currentTime, streamValueSet, index % 2 == 0)
  ));
}

module.exports = renderStreams;
