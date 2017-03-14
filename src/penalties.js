'use strict';

const _ = require('lodash');

const penalities = {};

/**
 *  Penalize Tribute bands, 'made famous by', etc. unless otherwise defined in source
 */
penalities.penalizeTributes = (input, compare) => {
  let isTribute = false;
  _.each(['tribute', 'karaoke', 'made famous'], modifier => {
    isTribute = isTribute || (compare.name.toLowerCase().indexOf(modifier) > -1 && input.toLowerCase().indexOf(modifier) === -1);
  });
  return isTribute ? 0.3 : 0;
};

/**
 *  Penalize remixes unless otherwise defined in source
 */
penalities.penalizeRemixMismatch = (input, compare) => {
  const remixMismatch = (compare.name.toLowerCase().indexOf('remix') > -1 && input.toLowerCase().indexOf('remix') === -1);
  return remixMismatch ? 0.2 : 0;
};

/**
 *  Penalize live tracks unless otherwise defined in source
 */
penalities.penalizeLiveMismatch = (input, compare) => {
  const liveMismatch = (compare.name.toLowerCase().indexOf('live') > -1 && input.toLowerCase().indexOf('live') === -1);
  return liveMismatch ? 0.2 : 0;
};

/**
 *  Ensure longer matches are preferred over short matches, all else equal
 */
penalities.penalizeLength = (input, compare) => {
  return 1 / ((compare.name.length || 0) * 50);
};

/**
 *  Ensure more popular matches are preferred over short matches, all else equal
 */
penalities.penalizeOnPopularity = (input, compare) => {
  return ((100 - compare.popularity) || 0) / 10000;
};

module.exports = {
  named: penalities,
  all: _.values(penalities)
};