const markers = [];
let map, currentLocation, geocode;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: currentLocation || {lat: -34.397, lng: 150.644},
    zoom: 14
  });

  geocode = new google.maps.Geocoder();

  map.addListener('click', function(e) {
    markers.push(makeMarker(e.latLng));
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
        infoWindow.textContent = getGatherableAddress(results[0]);
        const popup = new google.maps.InfoWindow({
          content: infoWindow
        });
        popup.open(map, marker);
        console.log(results);
      }
    }
  });

  return marker;
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

(function(geo) {
  if (geo) {
    geo.getCurrentPosition(function(pos) {
      currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      if (map) {
        map.setCenter(currentLocation);
      }
    });
  }
})(navigator.geolocation);
