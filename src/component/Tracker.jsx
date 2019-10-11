import React, { useState, useRef, useEffect } from "react";
import {
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

import Styles from './Styles'

const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;

const permissionPromise = () => {
    return new Promise(async (resolve, reject) => {
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

const getLocationData = (getter, setter, marker) => {
    if (Platform.OS === 'android') {
        permissionPromise().then(() => {
            console.log("You can use locations");
            setupWatchPositionData(getter, setter, marker);
        }).catch(() => {
            console.log("Location permission denied")
        })
    } else {
        setupWatchPositionData(getter, setter, marker);
    }
}

const setupWatchPositionData = (getter, setter, marker) => {
    const watchId = Geolocation.watchPosition(position => {
        console.log('setupWatchPositionData: ' + position);
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

const getMapRegionData = (latitude, longitude) => ({
    latitude: latitude,
    longitude: longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
});

const calcDistance = (prevLatLng, newLatLng) => {
    return haversine(prevLatLng, newLatLng) || 0;
};


const Tracker = () => {
    const initArea = new AnimatedRegion({ latitude: LATITUDE, longitude: LONGITUDE, latitudeDelta: 0, longitudeDelta: 0 });
    const [locations, setLocations] = useState({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        routeCoordinates: [],
        distanceTravelled: 0,
        prevLatLng: {},
        watchId: 0
    });

    const marker = useRef(null)

    useEffect(() => {
        return function cleanup() {
            Geolocation.clearWatch(locations.watchId)
        };
    })

    console.log(marker);
    getLocationData(locations, setLocations, marker);


    return (
        <View style={Styles.container}>
            <MapView
                style={Styles.map}
                provider={PROVIDER_GOOGLE}
                showUserLocation
                followUserLocation
                loadingEnabled
                region={getMapRegionData(locations.latitude, locations.longitude)}
            >
                <Polyline coordinates={locations.routeCoordinates} strokeWidth={5} />
                <Marker.Animated
                    ref={m => {
                        console.log("setting marker ref")
                        marker.current = m
                    }}
                    coordinate={initArea}
                />
            </MapView>
            <View style={Styles.buttonContainer}>
                <TouchableOpacity style={[Styles.bubble, Styles.button]}>
                    <Text style={Styles.bottomBarContent}>
                        {parseFloat(locations.distanceTravelled).toFixed(2)} km
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default Tracker;