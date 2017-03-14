'use strict';

const _ = require('lodash');

const artist_separators = [' and ', ' with ', ' x ', ' + ', ' & ', ', '];

/**
* Pre-generated 0-99 using 'number-to-words' module
*/
const numbers = _.reverse(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
  '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60',
  '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80',
  '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99']);

const number_strings = _.reverse(['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two',
  'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty',
  'thirty-one', 'thirty-two', 'thirty-three', 'thirty-four', 'thirty-five', 'thirty-six', 'thirty-seven', 'thirty-eight',
  'thirty-nine', 'forty', 'forty-one', 'forty-two', 'forty-three', 'forty-four', 'forty-five', 'forty-six', 'forty-seven',
  'forty-eight', 'forty-nine', 'fifty', 'fifty-one', 'fifty-two', 'fifty-three', 'fifty-four', 'fifty-five', 'fifty-six',
  'fifty-seven', 'fifty-eight', 'fifty-nine', 'sixty', 'sixty-one', 'sixty-two', 'sixty-three', 'sixty-four', 'sixty-five',
  'sixty-six', 'sixty-seven', 'sixty-eight', 'sixty-nine', 'seventy', 'seventy-one', 'seventy-two', 'seventy-three',
  'seventy-four', 'seventy-five', 'seventy-six', 'seventy-seven', 'seventy-eight', 'seventy-nine', 'eighty', 'eighty-one',
  'eighty-two', 'eighty-three', 'eighty-four', 'eighty-five', 'eighty-six', 'eighty-seven', 'eighty-eight', 'eighty-nine',
  'ninety', 'ninety-one', 'ninety-two', 'ninety-three', 'ninety-four', 'ninety-five', 'ninety-six', 'ninety-seven',
  'ninety-eight', 'ninety-nine']);

const utils = {};

utils.numberify = (value) => {
  value = value.toLowerCase();
  _.each(number_strings, (str, i) => {
    value = (` ${value} `).replace(` ${str} `, numbers[i]).trim();
  });

  return value;
};

utils.numberTextify = (value) => {
  value = value.toLowerCase();
  _.each(numbers, (str, i) => {
    value = (` ${value} `).replace(` ${str} `, number_strings[i]).trim();
  });

  return value;
};

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
  if (withoutParens.length >= 3) value = withoutParens;

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

  if (firstSegment.length >= 3)
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