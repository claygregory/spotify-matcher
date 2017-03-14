'use strict';

const _ = require('lodash');

const artist_separators = [' and ', ' with ', ' x ', ' + ', ' & ', ', '];

const utils = {};

utils.splitArtist = (value) => {
  let parts = _.values(utils.splitFeaturing(value));
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
  let parts = value.match(/(.*) [(\[]feat(uring)?\.? (.*?)[)\]]/i);
  if (!parts)
    parts = value.match(/(.*?) feat(uring)?\.? (.*)/i);

  if (parts) return { root: parts[1], featuring: parts[3] };
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