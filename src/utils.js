'use strict';

const _ = require('lodash');

const artist_separators = [' and ', ' with ', ' x ', ' + ', ' & ', ', '];

const utils = {};

utils.splitArtist = (value) => {
  let parts = _.compact(
    _.values(utils.splitFeaturing(value))
  );
  _.each(artist_separators, sep => {
    parts = _.flatMap(parts, part => part.toLowerCase().split(sep));
  });

  return _.uniq(parts);
};

utils.toAlbumQuery = (value) => {
  value = value.toLowerCase();
  value = utils.splitFeaturing(value).root;

  const withoutParens = utils.withoutParens(value);
  if (withoutParens.length >= 4) value = withoutParens;

  return _cleanQueryCharacters(value);
};

utils.toArtistQuery = (value) => {
  value = value.toLowerCase();
  value = utils.splitFeaturing(value).root;

  const firstSegment = _.chain(artist_separators)
    .map(sep => _.first(value.split(sep)))
    .sortBy(v => v.length)
    .first()
    .value()
    .trim();

  if (firstSegment.length > 4)
    value = firstSegment;

  return _cleanQueryCharacters(value);
};

utils.toTrackQuery = (value) => {
  value = value.toLowerCase();
  value = utils.splitFeaturing(value).root;

  const withoutParens = utils.withoutParens(value);
  if (withoutParens.length >= 4) value = withoutParens;

  return _cleanQueryCharacters(value);
};

utils.toQuery = (field, value) => {
  return utils[`to${_.capitalize(field)}Query`](value);
};

utils.splitFeaturing = (value) => {
  let parts = value.match(/(.*) [(\[](ft|feat|featuring)\.? (.*?)[)\]](.*)/i); //if in parens, don't be greedy
  let featuring, remainder;
  if (parts) {
    featuring = parts[3];
    remainder = parts[4];
  } else {
    parts = value.match(/(.*?) (ft|feat|featuring)\.? (.*)/i); //else greedily consume rest of track, but attempt to recreate remainder
    if (parts) {
      const featuring_remainder = (parts[3] || '').match(/(.*?)( [-—(\[].*)/i);
      featuring = featuring_remainder ? featuring_remainder[1] : parts[3];
      remainder = featuring_remainder ? featuring_remainder[2] : null;
    }
  }

  if (parts) return { root: parts[1], featuring: featuring, remainder: remainder };
  else return { root: value };
};

utils.withoutParens = (value) => {
  return value
    .replace(/ [(\[].*[)\]]/, '')
    .replace(/ - .*/, '')
    .replace(/ — .*/, '')
    .trim();
};

module.exports = utils;

function _cleanQueryCharacters(value) {
  return value
    .replace(/([a-z])\+([a-z])/, '$1 $2')
    .replace('+', '');
}