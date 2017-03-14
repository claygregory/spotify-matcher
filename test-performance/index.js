'use strict';

const Promise = require('bluebird');
const Table = require('cli-table2');

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const Matcher = require('../src/matcher');

const tests = fs.readFileSync(path.join(__dirname, './tests.tsv'), 'utf-8')
  .split('\n')
  .map(line => {
    const fields = ['artist', 'album', 'track', 'spotify_artist', 'spotify_album', 'spotify_track'];
    const values = line.split('\t');
    return _.zipObject(fields, values);
  });

function toSourceTableRow(object) {
  return _.chain(object)
    .pick(['artist', 'album', 'track', 'spotify_artist', 'spotify_album', 'spotify_track'])
    .values()
    .value();
}

function toResultTableRow(success, match) {
  const row = [success ? ' ' : 'X'];

  if (!match)
    return row;

  row.push(_.map(match.artist, 'name').join(', '));
  row.push(_.get(match, 'album.name'));
  row.push(_.get(match, 'track.name'));
  row.push(_.map(match.artist, 'id').join(', '));
  row.push(_.get(match, 'album.id'));
  row.push(_.get(match, 'track.id'));
  _.each(['score.artist', 'score.album', 'score.track'], field => {
    row.push((_.get(match, field) || 0).toFixed(5));
  });

  return row;
}

function correct(input, match) {
  match = match || {};
  const artistMatch = (input.spotify_artist || '') === _.map(match.artist, 'id').join(',');
  const albumMatch = (input.spotify_album || '') === _.get(match, 'album.id', '');
  const trackMatch = (input.spotify_track || '') === _.get(match, 'track.id', '');

  return [artistMatch, albumMatch, trackMatch];
}

const m = new Matcher();
const scorecard = [];
Promise.each(tests, test => {

  return m.matchTrack(test)
    .then(match => {

      const table = new Table({
        head: ['', 'Artist', 'Album', 'Track', 'Artist ID', 'Album ID', 'Track ID', 'Art. Score', 'Alb. Score', 'Tra. Score'],
        colWidths: [3, 35, 35, 35, 12, 12, 12, 12, 12, 12]
      });

      const corrects = correct(test, match);
      const isCorrect = _.compact(corrects).length === corrects.length;
      Array.prototype.push.apply(scorecard, corrects);

      table.push([' '].concat(toSourceTableRow(test)));
      table.push(toResultTableRow(isCorrect, match));
      
      console.log(table.toString());
      console.log('');
    });
}).then(() => {

  const correct = _.compact(scorecard).length;
  const total = scorecard.length;

  console.log('-------------------------------------');
  console.log('Correct: ' + (correct / total * 100).toFixed(2) + '%');
  console.log('-------------------------------------');
});
