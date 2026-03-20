import 'react-native-gesture-handler';
/**
 * エントリポイント: タスク登録・通知設定・メイン画面
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import './src/tasks/backgroundFetchTask';
import { registerBackgroundFetchAsync } from './src/tasks/backgroundFetchTask';
import { requestNotificationPermissions } from './src/services/notifications';
import HomeScreen from './src/screens/HomeScreen';
import StockDetailScreen from './src/screens/StockDetailScreen';

export type RootStackParamList = {
  Home: undefined;
  StockDetail: { ticker: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await requestNotificationPermissions();
      await registerBackgroundFetchAsync();
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {});
    return () => sub.remove();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="StockDetail" component={StockDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
