/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Suspense } from 'react'
import { Text } from 'react-native';

const Tracker = React.lazy(() => import('./src/component/'));
const App = () => {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <Tracker />
    </Suspense>
  );
}
export default App;
