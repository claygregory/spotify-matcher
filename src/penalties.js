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
  const remixTerms = ['remix', 'rmx', 'edit'];
  const hasRemix = (term) => _.reduce(remixTerms, (acc, t) => acc || term.toLowerCase().indexOf(t) > -1, false);

  const remixMismatch = hasRemix(compare.name) && !hasRemix(input);
  return remixMismatch ? 0.1 : 0;
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
  const L = 0.05;
  const k = 0.1;
  const x0 = 50;
  const f = (x) => L / (1 + Math.pow(Math.E, k * (x - x0)));

  return f(compare.popularity || 50);
};

module.exports = {
  named: penalities,
  all: _.values(penalities)
};

