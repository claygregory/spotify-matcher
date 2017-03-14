'use strict';

const Bottleneck = require('Bottleneck');

const request = require('request-promise');
const retry = require('bluebird-retry');
const _ = require('lodash');

const api_base = 'https://api.spotify.com/v1';

const default_options = {
  cache_requests: true,
  rate_limit_ms: 200
};

module.exports = class Client {

  constructor(access_token, options) {
    if (typeof access_token === 'function')
      this.access_token = access_token;
    else if (typeof access_token === 'string')
      this.access_token = () => access_token;

    this.options = _.defaults({}, options || {}, default_options);
    this.throttle = new Bottleneck(1, this.options.rate_limit_ms);

    if (this.options.cache_requests)
      this._doRequest = _.memoize(this._doRequest, (...params) => params.join(':')).bind(this);
  }

  getAlbum(id) {
    const url = `${api_base}/albums/${id}`;
    return this._doRequest('GET', url);
  }

  getArtist(id) {
    const url = `${api_base}/artists/${id}`;
    return this._doRequest('GET', url);
  }

  getTrack(id) {
    const url = `${api_base}/tracks/${id}`;
    return this._doRequest('GET', url);
  }

  getTrackFeatures(id) {
    const url = `${api_base}/audio-features/${id}`;
    return this._doRequest('GET', url)
      .catch(err => {
        if (err.message.includes('404'))
          return null;
        else
          throw err;
      });
  }

  search(q, options) {
    if (typeof q === 'object')
      q = this._encodeSearchQuery(q);
      
    q = encodeURIComponent(q.replace(/\+/, ''));
    const url_params = _.defaults({ q: q }, options || {}, { limit: 50 });

    const params_string = _.chain(url_params).toPairs().map(p => p.join('=')).join('&').value();

    const url = `${api_base}/search?${params_string}`;
    return this._doRequest('GET', url);
  }

  searchAlbums(artist, album) {
    return this.search({ artist: artist, album: album }, { type: 'album' });
  }

  searchArtists(artist) {
    return this.search({ artist: artist }, { type: 'artist' });
  }

  searchTracks(artist, album, track) {
    return this.search({ artist: artist, album: album, track: track }, { type: 'track' });
  }

  _encodeSearchQuery(terms) {
    const query = _.keys(terms).map(field => {

      let tokens = terms[field].split(' ');
      tokens = _.chain(tokens)
        .filter(token => token.match(/.*[a-z0-9].*/i))
        .map(token => token.replace(/"/, '')) 
        .map(token => token.replace(/\'/, '')) 
        .map(token => token.indexOf('*') > -1 ? `"${token}"` : token) //quote wildcard character
        .map(token => field !== 'q' ? `${field}:${token}` : token)
        .value();

      if (tokens.length)
        return tokens.join(' ');
      else
        return '';
    }).join(' ');

    return query;
  }

  _doRequest(method, url) {
    let headers = {};
    if (this.access_token) {
      headers = _.merge(headers, {
        Authorization: `Bearer ${this.access_token()}`
      });
    }

    return this.throttle.schedule(params => {
      return retry(() => request(params), { max_tries: 3, interval: 1000 });
    }, {
      method: method,
      uri: url,
      headers: headers,
      json: true
    });
  }

};
