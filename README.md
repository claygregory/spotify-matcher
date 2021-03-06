
# Spotify Matcher

This is a JavaScript module for matching artist/album/track information (such as from your music library) to Spotify IDs. Tossed together on short order, it's not pretty and robustness is questionable. As such, *the audience is primarily myself*, currently in a  personal data pipeline enriching [last.fm](https://www.last.fm/) scrobbles from a variety of sources (Pandora, iTunes, and Spotify).

As the input is expected to be from a variety of sources, each with differing tagging practices, matching is a bit beyond hitting the Spotify search endpoint and taking the top hit. The search endpoint is pretty sensitive to extraneous terms, so this module attempts to trim excess tokens from fields pre-query, casting a wide net and scoring/filtering search results client-side for best-match. In addition, we can't expect every track to be within the Spotify catalog, so scoring thresholds determine when it's acceptable to fail, rejecting the existence of a match.

## Installation

```bash
npm install --save @claygregory/spotify-matcher
```

## Usage Example

```javascript
const SpotifyMatcher = require('@claygregory/spotify-matcher');

const spotify = new SpotifyMatcher();
spotify.matchTrack({
  artist: 'The Naked and Famous',
  album: 'Simple Forms',
  track: 'Backslide'
}).then(match => {
  console.log(match);
});
```

The match object will contain artist, album, and track information, based on internal scoring. One or more of the fields may not be provided, if a suitable match was not found. A complete match object takes the form:

```json
{
  "artist": [
    {
      "id": "0oeUpvxWsC8bWS6SnpU8b9", "name": "The Naked And Famous"
    }
  ],
  "album": {
    "id": "0m9VQlYqaZTktKzkbGPsve", "name": "Simple Forms", "album_type": "album"
  },
  "track": {
    "id": "0CDJU9tQfysl3TS2yEwbxx",
    "name": "Backslide",
    "disc_number": 1,
    "track_number": 6,
    "explicit": false,
    "popularity": 39
  },
  "score": {
    "artist": 0.999, "album": 0.9983, "track": 0.9916, "composite": 0.9961
  }
}
```

Scores are based on the Jaro-Winkler similarity between the Spotify field name, and a processed version of provided field information that attempts to address common tagging mismatch concerns.

## Access Token and Options

The module operates with relatively sane defaults, and does not require a Spotify access token for small match jobs. However, a Spotify OAuth2 token may be provided, for a higher rate limit from Spotify.

```javascript
const spotify = new SpotifyMatcher(access_token, options);
```

The `access_token` is either a string, or a function to provide the token per-request (for example, to handle refreshing as needed on long-running match jobs). This library does not provide any OAuth access flow handling, that's on you.

The options object supports the following configuration(s), defaults as below:

```javascript
{
  cache_requests: true,  // Internally cache API responses for lifetime of instance?
  market: 'US',          // Spotify market (to avoid tracks not available to you)
  rate_limit_ms: 200,    // API rate limit
  score_threshold: {     // per field edit-distances to accept as match
    album: 0.65,
    artist: 0.90,
    track: 0.70,
    composite: 0.80
  },
  score_weights: {       // weight of each field when computing composite score
    album: 0.75,
    artist: 1,
    track: 1
  }
}
```

## Performance Testing

A test file of sample inputs and expected responses is provided in `test-performance/tests.tsv`, especially with regard to potential fail cases. Running `npm run perf` will process this file and provide performance results. Additions to this file welcome (US market IDs, please)!

## License

See the included [LICENSE](LICENSE.md) for rights and limitations under the terms of the MIT license.