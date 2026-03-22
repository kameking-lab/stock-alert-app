import 'react-native-gesture-handler';
/**
 * エントリポイント: タスク登録・通知設定・メイン画面
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import './src/tasks/backgroundFetchTask';
import { registerBackgroundFetchAsync } from './src/tasks/backgroundFetchTask';
import { requestNotificationPermissions } from './src/services/notifications';
import HomeScreen from './src/screens/HomeScreen';
import RankingScreen from './src/screens/RankingScreen';
import StockDetailScreen from './src/screens/StockDetailScreen';

export type MainTabParamList = {
  Home: undefined;
  Ranking: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  StockDetail: { ticker: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_BAR_STYLE = {
  backgroundColor: '#1C1C1E',
  borderTopColor: '#2C2C2E',
  borderTopWidth: 1,
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingScreen}
        options={{
          tabBarLabel: 'ランキング',
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

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
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="StockDetail" component={StockDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
