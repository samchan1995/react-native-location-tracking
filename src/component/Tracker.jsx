import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Platform,
    Alert
} from "react-native";
import MapView, {
    Marker,
    AnimatedRegion,
    Polyline,
    PROVIDER_GOOGLE
} from "react-native-maps";
import haversine from "haversine";
import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';
import Styles from './Styles'

const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;

const getMapRegionData = (latitude, longitude) => ({
    latitude: latitude,
    longitude: longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
});

const calcDistance = (prevLatLng, newLatLng) => {
    return haversine(prevLatLng, newLatLng) || 0;
};

const setupBgLocationData = (getter, setter, marker, coordinate) => {
    BackgroundGeolocation.configure({
        desiredAccuracy: BackgroundGeolocation.LOW_ACCURACY,
        stationaryRadius: 0,
        distanceFilter: 0,
        notificationTitle: 'Background tracking',
        notificationText: 'enabled',
        debug: false,
        startOnBoot: false,
        locationProvider: BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,
        interval: 60 * 1000,
        fastestInterval: 30 * 1000,
        activitiesInterval: 30 * 1000
    });
    console.log('configure');

    BackgroundGeolocation.on('authorization', (status) => {
        console.log('[INFO] BackgroundGeolocation authorization status: ' + status);
        if (status !== BackgroundGeolocation.AUTHORIZED) {
            // we need to set delay or otherwise alert may not be shown
            setTimeout(() =>
                Alert.alert('App requires location tracking permission', 'Would you like to open app settings?', [
                    { text: 'Yes', onPress: () => BackgroundGeolocation.showAppSettings() },
                    { text: 'No', onPress: () => console.log('No Pressed'), style: 'cancel' }
                ]), 1000);
        }
    });


    BackgroundGeolocation.on('location', location => {
        console.log('[DEBUG] BackgroundGeolocation location', location);
        BackgroundGeolocation.startTask(taskKey => {
            const newCoordinate = { latitude: location.latitude, longitude: location.longitude };
            console.log(newCoordinate);
            if (Platform.OS === "android") {
                marker.current._component.animateMarkerToCoordinate(
                    newCoordinate,
                    500
                );
            } else {
                coordinate.current.timing(newCoordinate).start();
            }

            setter({
                latitude: newCoordinate.latitude,
                longitude: newCoordinate.longitude,
                routeCoordinates: getter.routeCoordinates.concat([newCoordinate]),
                distanceTravelled: getter.distanceTravelled + calcDistance(getter.prevLatLng, newCoordinate),
                prevLatLng: newCoordinate
            })
            BackgroundGeolocation.endTask(taskKey);
        });
    });

    BackgroundGeolocation.checkStatus(status => {
        console.log('[INFO] BackgroundGeolocation service is running', status.isRunning);
        console.log('[INFO] BackgroundGeolocation services enabled', status.locationServicesEnabled);
        console.log('[INFO] BackgroundGeolocation auth status: ' + status.authorization);

        // you don't need to check status before start (this is just the example)
        if (!status.isRunning) {
            BackgroundGeolocation.start(); //triggers start on start event
        }
    });

    console.log('start');
}

const Tracker = () => {
    console.log("Tracker")
    const initArea = new AnimatedRegion({ latitude: LATITUDE, longitude: LONGITUDE, latitudeDelta: 0, longitudeDelta: 0 });

    const [location, setLocation] = useState({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        routeCoordinates: [],
        distanceTravelled: 0,
        prevLatLng: {}
    });

    const marker = useRef(null);

    const coordinate = useRef(new AnimatedRegion({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: 0,
        longitudeDelta: 0
    }));

    const firstLoad = useRef(true);

    useEffect(() => {
        if (firstLoad.current === true) {
            setupBgLocationData(location, setLocation, marker, coordinate);
            firstLoad.current = false
        }
        
        return function cleanup() {
            console.log('cleanup')
            // BackgroundGeolocation.removeAllListeners();
        };
    })

    return (
        <View style={Styles.container}>
            <MapView
                style={Styles.map}
                provider={PROVIDER_GOOGLE}
                showUserLocation
                followUserLocation
                loadingEnabled
                region={getMapRegionData(location.latitude, location.longitude)}
            >
                <Polyline coordinates={location.routeCoordinates} strokeWidth={5} />
                <Marker.Animated
                    ref={m => {
                        console.log("setting marker ref")
                        marker.current = m
                    }}
                    coordinate={coordinate.current}
                />
            </MapView>
            <View style={Styles.buttonContainer}>
                <TouchableOpacity style={[Styles.bubble, Styles.button]}>
                    <Text style={Styles.bottomBarContent}>
                        {parseFloat(location.distanceTravelled).toFixed(2)} km
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default Tracker;