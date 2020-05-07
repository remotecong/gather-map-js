const markers = [];
let map, currentLocation, geocode;

const IS_DEBUG = /localhost/.test(window.location.href);
const IS_STAGE = window.location.host.endsWith("netlify.app");

const apiUrl = IS_DEBUG
  ? "http://localhost:7712"
  : IS_STAGE
  ? "https://stage-api.remotecong.com"
  : "https://api.remotecong.com";

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), getMapState());

  geocode = new google.maps.Geocoder();

  map.addListener("click", function (e) {
    markers.push(makeMarker(e.latLng));
  });

  map.addListener("idle", function () {
    saveMapState({
      center: map.getCenter(),
      zoom: map.getZoom()
    });
  });
}

function makeMarker(position) {
  const infoWindow = document.createElement("div");
  infoWindow.className = "popup";

  const marker = new google.maps.Marker({
    position,
    map
  });

  geocode.geocode({ location: position }, function (results, status) {
    if (status === "OK") {
      if (results[0]) {
        const address = getGatherableAddress(results[0]);
        const addressInput = copyableInput(address);
        infoWindow.innerHTML = `${addressInput}<br /><img style="width:40px;display:block;margin:auto;" src="/loading.gif" />`;
        const popup = new google.maps.InfoWindow({
          content: infoWindow
        });
        const onMarkerClick = () => popup.open(map, marker);
        onMarkerClick();
        marker.addListener("click", onMarkerClick);

        if (IS_DEBUG) {
          console.log("GOOGLE GEOCODE:", results);
        }

        gatherLookup(address, infos => {
          if (Array.isArray(infos)) {
            infoWindow.innerHTML = copyableInput(infos.join("\t"));
          } else {
            infoWindow.innerHTML = "";
            infoWindow.appendChild(infos);
          }
        });
      }
    }
  });

  return marker;
}

function getLastName(name) {
  return name.replace(" or Current Resident", "").split(" ").pop();
}

function copyableInput(val) {
  return `<input type="text" value="${val}" onFocus="this.select();" />`;
}

function gatherLookup(addr, callback, tries = 1) {
  return fetch(`${apiUrl}/?address=${encodeURIComponent(addr)}`)
    .then(response => response.ok && response.json())
    .then(data => {
      if (IS_DEBUG) {
        console.log("GATHER:", data);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const { phones, orCurrentResident, name } = data;

      const displayName =
        name + (orCurrentResident ? " or Current Resident" : "");
      const displayPhones = phones.length
        ? phones.map(({ number }) => number).join(", ")
        : "No number found";

      callback([displayName, addr, displayPhones]);
    })
    .catch(err => {
      console.error("GATHER ERR:", err);

      const fragment = document.createDocumentFragment();

      if (9 < tries) {
        const p = document.createElement("p");
        p.innerHTML = `Please write "Failed to lookup" in the name field for <strong>${addr}</strong> for the territory.`;
        fragment.appendChild(p);
        callback(fragment);
        return;
      }

      const btn = document.createElement("button");
      btn.textContent = `Retry ${addr}`;
      btn.addEventListener("click", () => {
        btn.disabled = true;
        btn.textContent = "Retrying...";
        gatherLookup(addr, callback, tries + 1);
      });
      fragment.appendChild(btn);
      callback(fragment);
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
    const num = getAddressComponent(place.address_components, "street_number");
    const street = getAddressComponent(place.address_components, "route", true);
    const city = getAddressComponent(
      place.address_components,
      "locality",
      true
    );
    const state = getAddressComponent(
      place.address_components,
      "administrative_area_level_1",
      true
    );
    if (num && street && city && state) {
      return `${num} ${street}, ${city}, ${state}`;
    }
  }
  return place.formatted_address;
}

const LAST_KNOWN_COORDS_KEY = "last-known-coords";

function saveMapState(coords) {
  window.localStorage.setItem(LAST_KNOWN_COORDS_KEY, JSON.stringify(coords));
}

function getMapState() {
  try {
    const str = window.localStorage.getItem(LAST_KNOWN_COORDS_KEY);
    if (str) {
      return JSON.parse(str);
    }
  } catch (ignore) {}
  return {
    center: { lat: 36.11311811576981, lng: 264.12948609197935 },
    zoom: 12
  };
}
