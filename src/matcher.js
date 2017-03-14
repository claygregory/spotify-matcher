'use strict';

const Client = require('./client');

const jaroWinkler = require('talisman/metrics/distance/jaro-winkler');
const penalties = require('./penalties').all;
const unidecode = require('unidecode');
const utils = require('./utils');
const _ = require('lodash');

const default_options = {
  score_threshold: {
    album: 0.65,
    artist: 0.90,
    track: 0.70,
    composite: 0.80
  },
  score_weights: {
    album: 0.75,
    artist: 1,
    track: 1
  },
  ignored_terms: ['remastered'],
  market: 'US'
};

module.exports = class Matcher {

  constructor(access_token, options) {
    this.client = new Client(access_token, options);
    this.options = _.defaults({}, options || {}, default_options);
  }

  matchTrack(input) {

    return this._matchByTrack(input)
      .then(matches => {
        if (matches.length || !input.album) return matches;
        else return this._matchByAlbum(input);
      })
      .then(matches => {
        if (matches.length) return matches;
        else return this._matchByArtist(input);
      })
      .then(matches => _.first(matches));
  }

  _enumerateVariations(field, input) {
    const variations = this[`_enumerate${_.capitalize(field)}Variations`].call(this, input)
      .map(v => v.toLowerCase());

    return _.uniq(variations);
  }

  _enumerateArtistVariations(input) {
    const variations = [input];

    variations.push(utils.numberify(input));
    variations.push(utils.numberTextify(input));

    const featuring = utils.splitFeaturing(input);
    variations.push(featuring.root);
    _.each(utils.splitArtist(input), a => variations.push(a));

    return variations;
  }

  _enumerateAlbumVariations(input) {
    const variations = [input];

    variations.push(utils.numberify(input));
    variations.push(utils.numberTextify(input));

    const featuring = utils.splitFeaturing(input);
    variations.push(featuring.root);
    variations.push(featuring.root + (featuring.remainder || ''));

    _.each(input.split(':'), part => {
      if (part.length > 4 || part.length > 0.33 * input.length)
        variations.push(part);
    });

    const dropSquareBrackets = input.replace(/\[.*?\]/, '');
    if (dropSquareBrackets.length > input.length * 0.3)
      variations.push(dropSquareBrackets);

    return variations;
  }

  _enumerateTrackVariations(input) {
    const variations = [input];

    variations.push(utils.numberify(input));
    variations.push(utils.numberTextify(input));

    const featuring = utils.splitFeaturing(input);
    variations.push(featuring.root);
    variations.push(featuring.root + (featuring.remainder || ''));

    return variations;
  }

  _matchByArtist(input) {

    const artistQuery = utils.toQuery('artist', input.artist || '');

    return this.client.searchArtists(artistQuery, { market: this.options.market })
      .then(result => result.artists.items)
      .then(artists => _.map(artists, artist => {
        return { artist: [this._transformArtistResponse(artist)] };
      }))
      .then(matches => this._scoreMatches(input, matches, ['artist']))
      .then(this._filterMatches.bind(this));
  }

  _matchByAlbum(input) {

    const artistQuery = utils.toQuery('artist', input.artist || '');
    const albumQuery = utils.toQuery('album', input.album || '');

    return this.client.search({ artist: artistQuery , album: albumQuery }, { type: 'album', market: this.options.market })
      .then(result => {

        return _.map(result.albums.items, item => {
          const album = this._transformAlbumResponse(item);
          const artists = item.artists.map(this._transformArtistResponse);

          return {
            artist: artists,
            album: album
          };
        });

      })
      .then(matches => this._scoreMatches(input, matches, ['artist', 'album']))
      .then(this._filterMatches.bind(this));
  }

  _matchByTrack(input) {

    const artistQuery = utils.toQuery('artist', input.artist || '');
    const trackQuery = utils.toQuery('track', input.track || '');

    return this.client.search({ artist: artistQuery , q: trackQuery }, { type: 'track', market: this.options.market })
      .then(result => {

        return _.map(result.tracks.items, item => {
          const album = this._transformAlbumResponse(item.album);
          const artists = item.artists.map(this._transformArtistResponse);
          const track = this._transformTrackResponse(item);

          return {
            artist: artists,
            album: album,
            track: track
          };
        });

      })
      .then(matches => this._scoreMatches(input, matches, ['artist', 'album', 'track']))
      .then(_.bind(this._filterMatches, this, _, ['album', 'track'], 'track'));
  }

  _filterMatches(matches, thresholdFields, requiredField) {
    matches = _.chain(matches)
      .filter(m => m.score.composite > _.get(this.options, 'score_threshold.composite'))
      .value();

    _.each(matches, match => {
      _.each(thresholdFields || [], field => {
        if (_.get(match, `score.${field}`, 0) < _.get(this.options, `score_threshold.${field}`)) {
          _.unset(match, field);
          _.unset(match.score, field);
        }
      });
    });

    if (requiredField)
      matches = _.filter(matches, m => _.has(m.score, requiredField));

    if (!_.isEmpty(thresholdFields))
      matches = _.filter(matches, m => _.keys(_.pick(m.score, thresholdFields)).length > 0);

    return _.chain(matches)
      .sortBy('score.composite')
      .reverse()
      .value();
  }

  _scoreMatches(input, matches, fields) {
    _.forEach(matches, match => {
      match.score = {};
      _.forEach(fields, field => {
        if (input[field])
          match.score[field] = this._scoreBestCombination(this._enumerateVariations(field, input[field]), match[field]);
      });

      match.score.composite = this._scoreComposite(match);
    });

    return matches;
  }

  _scoreBestCombination(inputs, matches) {
    inputs = _.flatten([inputs]);
    matches = _.flatten([matches]);

    const scores = _.flatMap(inputs, s => {
      return _.map(matches, m => {

        const preproc = t => {
          let p = unidecode(t.toLowerCase());
          p = p.replace(/[ .…,\-—()\[\]]/g, '');
          _.each(this.options.ignored_terms, it => p = p.replace(it, ''));
          return p;
        };

        let sim = jaroWinkler(preproc(s), preproc(m.name));

        const penality = penalties.reduce((sum, penality) => {
          return sum + penality(s, m);
        }, 0);

        return Math.max(0, sim - penality);
      });
    });

    return Math.max.apply(null, scores);
  }

  _scoreComposite(match) {
    let sum = 0;
    let n = 0;
    _.each(match.score, (value, field) => {
      const fieldWeight = _.get(this.options, `score_weights.${field}`, 1);
      n += fieldWeight;
      sum += fieldWeight * value;
    });

    return sum / n;
  }

  _transformAlbumResponse(album) {
    return _.pick(album, ['id', 'name', 'album_type', 'popularity']);
  }

  _transformArtistResponse(artist) {
    return _.pick(artist, ['id', 'name', 'popularity']);
  }

  _transformTrackResponse(track) {
    return _.pick(track, ['id', 'name', 'disc_number', 'track_number', 'explicit', 'popularity']);
  }

};
