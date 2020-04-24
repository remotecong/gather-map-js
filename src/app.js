const markers = [];
let map, currentLocation, geocode;
const apiUrl = /localhost/.test(window.location.href) ?
  'http://localhost:7712' :
  'https://api.remotecong.com';

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), getMapState());

  geocode = new google.maps.Geocoder();

  map.addListener('click', function(e) {
    markers.push(makeMarker(e.latLng));
  });

  map.addListener('idle', function() {
    saveMapState({
      center: map.getCenter(),
      zoom: map.getZoom(),
    });
  });
}

function makeMarker(position) {
  const infoWindow = document.createElement('div');
  infoWindow.className = 'popup';

  const marker = new google.maps.Marker({
    position,
    map,
  });

  geocode.geocode({location: position}, function(results, status) {
    if (status === 'OK') {
      if (results[0]) {
        let address = getGatherableAddress(results[0]);
        infoWindow.innerHTML = `${address}<br /><img style="width:40px;display:block;margin:auto;" src="/loading.gif" />`;
        const popup = new google.maps.InfoWindow({
          content: infoWindow
        });
        const onMarkerClick = () => popup.open(map, marker);
        onMarkerClick();
        marker.addListener('click', onMarkerClick);
        console.log(results);
        gatherLookup(address, (str) => infoWindow.innerHTML = `${address}<br />${str}`);
      }
    }
  });

  return marker;
}

function getLastName(name) {
  return name.split(" ").pop();
}

function gatherLookup(addr, callback) {
  return fetch(`${apiUrl}/?address=${encodeURIComponent(addr)}`)
    .then((response) => response.ok && response.json())
    .then((data) => {
      console.log('GATHER', data);
      if (data.error) {
        throw new Error(data.error);
      }

      const { phones, livesThere, ownerName } = data;

      const name = livesThere ?
        ownerName :
        (phones.length ?
          phones[0].name :
          `${ownerName} or <em>Current Resident</em>`);

      const lastName = getLastName(name);

      const displayPhones = phones.filter(({ name }) => {
        if (livesThere) {
          return true;
        }
        return lastName === getLastName(name);
      });

      const html = displayPhones.length ?
        displayPhones.reduce((str, phone) => {
          return str + `<li title="${phone.isMobile ? 'Mobile' : 'Landline'}">${phone.number}</li>`;
        }, '<ul>') + '</ul>' :
        '<p>No phone numbers found</p>';

      callback(`<p style="font-weight: bold;" title="${data.ownerName}">${name}</p>${html}`);
    })
    .catch((err) => {
      console.error('GATHER ERR', err);
      callback('FAILED TO LOOKUP! SEE LOGS');
    });
}


function getAddressComponent(components, type, useShortName = false) {
  const match = components.find(({ types }) => types.includes(type));
  if (match) {
    return useShortName ? match.short_name : match.long_name;
  }
}

function getGatherableAddress(place) {
  if (place.address_components.length) {
    const num = getAddressComponent(place.address_components, 'street_number');
    const street = getAddressComponent(place.address_components, 'route', true);
    const city = getAddressComponent(place.address_components, 'locality', true);
    const state = getAddressComponent(place.address_components, 'administrative_area_level_1', true);
    if (num && street && city && state) {
      return `${num} ${street}, ${city}, ${state}`;
    }
  }
  return place.formatted_address;
}

const LAST_KNOWN_COORDS_KEY = 'last-known-coords';

function saveMapState(coords) {
  window.localStorage.setItem(LAST_KNOWN_COORDS_KEY, JSON.stringify(coords));
}

function getMapState() {
  try {
    const str = window.localStorage.getItem(LAST_KNOWN_COORDS_KEY);
    if (str) {
      return JSON.parse(str);
    }
  } catch(ignore) {
  }
  return {"center":{"lat":36.11311811576981,"lng":264.12948609197935},"zoom":12};
}
