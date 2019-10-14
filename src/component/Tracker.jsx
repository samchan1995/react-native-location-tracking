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
const LATITUDE = 0;
const LONGITUDE = 0;

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
    console.log("Tracker")

    const [state, setState] = useState({
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

    const setupBgLocationData = () => {
        BackgroundGeolocation.configure({
            desiredAccuracy: BackgroundGeolocation.LOW_ACCURACY,
            stationaryRadius: 50,
            distanceFilter: 50,
            notificationTitle: 'Background tracking',
            notificationText: 'enabled',
            debug: false,
            startOnBoot: false,
            locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
            interval: 5 * 1000,
            fastestInterval: 3 * 1000,
            stopOnStillActivity: false,
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

                setState(lastState => {
                    return {
                        latitude: newCoordinate.latitude,
                        longitude: newCoordinate.longitude,
                        routeCoordinates: lastState.routeCoordinates.concat([location]),
                        distanceTravelled: lastState.distanceTravelled + calcDistance(lastState.prevLatLng, newCoordinate),
                        prevLatLng: newCoordinate
                    }
                })
                BackgroundGeolocation.endTask(taskKey);
            });
        });

        BackgroundGeolocation.on('background', () => {
            console.log('[INFO] App is in background');
          });
      
          BackgroundGeolocation.on('foreground', () => {
            console.log('[INFO] App is in foreground');
          });
    }

    useEffect(() => {
        setupBgLocationData()
        BackgroundGeolocation.start();
        console.log('start');
        return function cleanup() {
            console.log('cleanup')
            BackgroundGeolocation.removeAllListeners();
        };
    }, [])

    return (
        <View style={Styles.container}>
            <MapView
                style={Styles.map}
                provider={PROVIDER_GOOGLE}
                showUserLocation
                followUserLocation
                loadingEnabled
                region={getMapRegionData(state.latitude, state.longitude)}
            >
                {state.routeCoordinates.map((location, index) => {
                    // not using strokeColors because it only supports iOS
                    if (index > 0) {
                        const newCoordinate = { latitude: location.latitude, longitude: location.longitude };
                        const color = location.accuracy < 50 ? 'green' : 'blue';
                        const lastLocation = state.routeCoordinates[index - 1];
                        const lastCoordinate = { latitude: lastLocation.latitude, longitude: lastLocation.longitude };
                        return < Polyline key={location.id} coordinates={[lastCoordinate, newCoordinate]} strokeColor={color} strokeWidth={5} />
                    }
                })}
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
                        {parseFloat(state.distanceTravelled).toFixed(2)} km
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default Tracker;