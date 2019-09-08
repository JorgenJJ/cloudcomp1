let express = require('express');
let XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
let router = express.Router();

const songkickKey = "i4WMQp2mMkLXBpRI";
const googleMapsKey = "AIzaSyC-sLg39d2L0pJh73HHyVhAP3YW0avmTcg";
let spotifyToken = "";
let param = {
  artist : "",
  similars : "",
  performances : "",
  toggleVisibilty : {artistNotHidden : false, resultsNotHidden : false},
  defaultValues : {inputArtist : "", inputArtistFeedback : "Search for artist", inputNumber : 5, inputAmount: 4}
};

let artist = new Object();

let similars = [];
let concerts = [];

router.use(express.urlencoded());
router.use(express.json());

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {data: param});
});

router.post('/spotifySearchArtist', function(req, res) {
  param.defaultValues.inputArtist = req.body.query;
  resetEventsList();
  const clientCred = "Basic NGNhZmIxYjU4MjEzNGQ5MGI2ZDgwZTliZmY4NDQ5Mzc6ZDRiZjkxZTJhOTMyNDVjZmIzYzE3NWRlNDY2NzkzMjI=";

  const xhrAuth = new XMLHttpRequest();
  const urlAuth = 'https://accounts.spotify.com/api/token';
  xhrAuth.open("POST", urlAuth);
  xhrAuth.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhrAuth.setRequestHeader("Authorization", clientCred);

  xhrAuth.onreadystatechange=function() {
    if(this.readyState==4 && this.status==200) {
      let respAuth = JSON.parse(xhrAuth.responseText);
      spotifyToken = respAuth.access_token;

      let data = "?q=" + req.body.query + "&type=artist&limit=1";

      const xhr = new XMLHttpRequest();
      const url = 'https://api.spotify.com/v1/search';
      xhr.open("GET", url + data);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Authorization", "Bearer " + spotifyToken);

      xhr.onreadystatechange=function() {
        if(this.readyState==4 && this.status==200) {
          let resp = JSON.parse(xhr.responseText);
          console.log(resp);
          if (resp.artists.total != 0) {
            let artist = new Object();
            artist.id = resp.artists.items[0].id;
            artist.name = resp.artists.items[0].name;
            artist.img = resp.artists.items[0].images[2].url;
            param.artist = artist;

            param.toggleVisibilty.artistNotHidden = true;
            param.defaultValues.inputArtistFeedback = "Search for artist";
            res.render('index', {data: param});
          }
          else {
            param.defaultValues.inputArtistFeedback = "Artist not found";
            param.defaultValues.inputArtist = "";
            res.render('index', {data: param});
          }
        }
      }
      xhr.send();
    }
  }
  xhrAuth.send('grant_type=client_credentials');
});

router.post('/songkick', function(req, res) {
  req.body.number = inputValidationNumber(req.body.number, 0, 10);
  req.body.amount = inputValidationNumber(req.body.amount, 1, 10);
  if (similars.length == 0 || (req.body.number != param.defaultValues.inputNumber || req.body.amount != param.defaultValues.inputAmount)) {
    param.defaultValues.inputNumber = req.body.number;
    param.defaultValues.inputAmount = req.body.amount;

    const xhr = new XMLHttpRequest();
    const url = 'https://api.songkick.com/api/3.0/search/artists.json';
    let data = '?apikey=' + songkickKey + '&query=' + param.artist.name + '&per_page=1';

    xhr.open("GET", url + data);

    xhr.onreadystatechange = function() {
      if(this.readyState == 4 && this.status == 200) {
        let resp = JSON.parse(xhr.responseText);
        let songkickArtistId = resp.resultsPage.results.artist[0].id;

        console.log(resp.resultsPage.results.artist[0].displayName);

        const xhr2 = new XMLHttpRequest();
        const url2 = 'https://api.songkick.com/api/3.0/artists/' + songkickArtistId + '/calendar.json';
        let data2 = '?apikey=' + songkickKey + '&per_page=' + req.body.amount;

        xhr2.open("GET", url2 + data2);

        xhr2.onreadystatechange = function() {
          if(this.readyState == 4 && this.status == 200) {
            let resp2 = JSON.parse(xhr2.responseText);

            const xhr3 = new XMLHttpRequest();
            const url3 = "https://api.songkick.com/api/3.0/artists/" + songkickArtistId + "/similar_artists.json";
            let data3 = '?apikey=' + songkickKey + '&per_page=' + req.body.number;
            xhr3.open("GET", url3 + data3);

            xhr3.onreadystatechange=function() {
              if(this.readyState==4 && this.status==200) {
                let resp3 = JSON.parse(xhr3.responseText);
                if (resp3.resultsPage.totalEntries != 0) {

                  for (let i = 0; i < req.body.number; i++) {
                    let similar = new Object();
                    similar.id = resp3.resultsPage.results.artist[i].id;
                    similar.name = resp3.resultsPage.results.artist[i].displayName;
                    similar.url = resp3.resultsPage.results.artist[i].uri;

                    console.log("|---" + similar.name);
                    let similarConcerts = [];

                    const similarXHR = new XMLHttpRequest();
                    const similarURL = 'https://api.songkick.com/api/3.0/artists/' + similar.id + '/calendar.json'
                    let similarData = '?apikey=' + songkickKey + '&per_page=' + req.body.amount;

                    similarXHR.open("GET", similarURL + similarData, false);
                    similarXHR.onload = function(e) {
                      let similarResponse = JSON.parse(similarXHR.responseText);
                      if (similarResponse.resultsPage.totalEntries > 0) {
                        for (let j = 0; j < req.body.amount; j++) {
                          let similarConcert = new Object();
                          if (typeof(similarResponse.resultsPage.results.event[j]) != 'undefined') {
                            similarConcert.id = similarResponse.resultsPage.results.event[j].id;
                            similarConcert.title = similarResponse.resultsPage.results.event[j].displayName;
                            similarConcert.uri = similarResponse.resultsPage.results.event[j].uri;
                            similarConcert.artist = similarResponse.resultsPage.results.event[j].performance[0].displayName;
                            similarConcert.timeanddate = similarResponse.resultsPage.results.event[j].start.date;
                            similarConcert.venue = similarResponse.resultsPage.results.event[j].venue.displayName;
                            similarConcert.city = similarResponse.resultsPage.results.event[j].location.city;
                            similarConcert.location = {lat : similarResponse.resultsPage.results.event[j].location.lat, lng : similarResponse.resultsPage.results.event[j].location.lng};
                            similarConcerts[j] = similarConcert;
                            console.log("|------" + similarResponse.resultsPage.results.event[j].displayName);
                          }
                        }
                        similar.concerts = similarConcerts;

                      }
                      else {
                        console.log("|------No concerts");
                        similar.concerts = null;
                      }
                    };
                    similarXHR.onerror = function() {
                      console.error("Error with XMLHttpRequest");
                    }
                    similars[i] = similar;
                    similarXHR.send()
                  }
                  if (resp2.resultsPage.totalEntries != 0) {
                    for (let i = 0; i < resp2.resultsPage.results.event.length; i++) {
                      let concert = new Object();
                      concert.id = resp2.resultsPage.results.event[i].id;
                      concert.title = resp2.resultsPage.results.event[i].displayName;
                      concert.uri = resp2.resultsPage.results.event[i].uri;
                      concert.artist = resp2.resultsPage.results.event[i].performance[0].displayName;
                      concert.timeanddate = resp2.resultsPage.results.event[i].start.date;
                      concert.venue = resp2.resultsPage.results.event[i].venue.displayName;
                      concert.city = resp2.resultsPage.results.event[i].location.city;
                      concert.location = {lat : resp2.resultsPage.results.event[i].location.lat, lng : resp2.resultsPage.results.event[i].location.lng};
                      concerts[i] = concert;
                    }
                  }
                  let allEvents = concerts;
                  for (let i = 0; i < req.body.number; i++) {
                    if (similars[i].concerts != null) {
                      allEvents = allEvents.concat(similars[i].concerts);
                    }
                  }
                  allEvents.sort((a, b) => (a.timeanddate > b.timeanddate) ? 1 : -1);
                  param.performances = allEvents;
                  param.toggleVisibilty.resultsNotHidden = true;
                  res.render('index', {data: param});
                }
                else {
                  console.log("No similar artists found");
                  param.toggleVisibilty.resultsNotHidden = true;
                  res.render('index', {data: param});
                }
              }
            }
            xhr3.send();
          }
        }
        xhr2.send();
      }
    }
    xhr.send();

  }
  else {
    res.render('index', {data: param});
  }

});

function resetEventsList() {
  similars = [];
  similarConcerts = [];
  concerts = [];
  param.toggleVisibilty.resultsNotHidden = false;
  param.performances = concerts;
}

function inputValidationNumber(number, min, max) {
  if (number < min || typeof(number) != "number")
    return min;
  else if (number > max)
    return max;
  else return number;
}

module.exports = router;
