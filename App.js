/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  PermissionsAndroid
} from "react-native";
import MapView, {
  Marker,
  AnimatedRegion,
  Polyline,
  PROVIDER_GOOGLE
} from "react-native-maps";
import haversine from "haversine";
import Geolocation from '@react-native-community/geolocation';

// const LATITUDE = 29.95539;
// const LONGITUDE = 78.07513;
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;

const permissionPromise = () => {
  return new Promise(async(resolve, reject) => {
    const permissions = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        'title': 'Location Permission',
        'message': 'This App needs access to your location ' +
          'so we can know where you are.'
      }
    );
    if (permissions === PermissionsAndroid.RESULTS.GRANTED) resolve();
    else reject();
  });
}

const getLocation = (getter, setter, marker) => {
  if (Platform.OS === 'android') {
    permissionPromise().then( () => {
      console.log("You can use locations");
      setupWatchPosition(getter, setter, marker);
    }).catch( () => {
      console.log("Location permission denied")
    } )
  } else {
    setupWatchPosition(getter, setter, marker);
  }
}

const setupWatchPosition = (getter, setter, marker) => {
  const watchId = Geolocation.watchPosition( position => {
    console.log('setupWatchPosition: ' + position);
    const newCoordinate = position.coords
    if (Platform.OS === "android") {
        marker.current._component.animateMarkerToCoordinate(
          newCoordinate,
          500
        );
    } else {
      getter.coordinate.timing(newCoordinate).start();
    }

    setter({
      latitude: newCoordinate.latitude,
      longitude: newCoordinate.longitude,
      routeCoordinates: getter.routeCoordinates.concat([newCoordinate]),
      distanceTravelled: getter.distanceTravelled + calcDistance(getter.prevLatLng, newCoordinate),
      prevLatLng: newCoordinate,
      watchId: watchId
    })
  }, error => console.log(error), {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 1000,
    distanceFilter: 10
  })
}

const getMapRegion = (latitude, longitude) => ({
  latitude: latitude,
  longitude: longitude,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA
});

const calcDistance = (prevLatLng, newLatLng) => {
  return haversine(prevLatLng, newLatLng) || 0;
};


const App = () => {
  const initArea = new AnimatedRegion({latitude: LATITUDE, longitude: LONGITUDE, latitudeDelta: 0, longitudeDelta: 0});
  const [locations, setLocations] = useState({
    latitude: LATITUDE,
    longitude: LONGITUDE,
    routeCoordinates: [],
    distanceTravelled: 0,
    prevLatLng: {},
    watchId: 0
  });

  const marker = useRef(null)

  useEffect( () => {
    return function cleanup() {
      Geolocation.clearWatch(locations.watchId)
    };
  })

  console.log(marker);
  getLocation(locations, setLocations, marker);


  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showUserLocation
        followUserLocation
        loadingEnabled
        region={getMapRegion(locations.latitude, locations.longitude)}
      >
        <Polyline coordinates={locations.routeCoordinates} strokeWidth={5} />
        <Marker.Animated
            ref={m => {
              console.log("123")
              marker.current = m
            }}
            coordinate={initArea}
          />
      </MapView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.bubble, styles.button]}>
          <Text style={styles.bottomBarContent}>
            {parseFloat(locations.distanceTravelled).toFixed(2)} km
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center"
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  bubble: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20
  },
  latlng: {
    width: 200,
    alignItems: "stretch"
  },
  button: {
    width: 80,
    paddingHorizontal: 12,
    alignItems: "center",
    marginHorizontal: 10
  },
  buttonContainer: {
    flexDirection: "row",
    marginVertical: 20,
    backgroundColor: "transparent"
  }
});

export default App;
