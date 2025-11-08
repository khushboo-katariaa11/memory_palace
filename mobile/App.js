import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import UploadScreen from './src/screens/UploadScreen';
import MemoriesScreen from './src/screens/MemoriesScreen';
import MemoryDetailScreen from './src/screens/MemoryDetailScreen';
import FaceTaggingScreen from './src/screens/FaceTaggingScreen';
import SearchScreen from './src/screens/SearchScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4A90E2',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Memory Palace' }}
        />
        <Stack.Screen
          name="Upload"
          component={UploadScreen}
          options={{ title: 'Create Memory' }}
        />
        <Stack.Screen
          name="Memories"
          component={MemoriesScreen}
          options={{ title: 'My Memories' }}
        />
        <Stack.Screen
          name="MemoryDetail"
          component={MemoryDetailScreen}
          options={{ title: 'Memory' }}
        />
        <Stack.Screen
          name="FaceTagging"
          component={FaceTaggingScreen}
          options={{ title: 'Tag People' }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: 'Search Memories' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
