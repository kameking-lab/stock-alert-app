/**
 * エントリポイント: タスク登録・通知設定・メイン画面
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import './src/tasks/backgroundFetchTask';
import { registerBackgroundFetchAsync } from './src/tasks/backgroundFetchTask';
import { requestNotificationPermissions } from './src/services/notifications';
import HomeScreen from './src/screens/HomeScreen';

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
      <StatusBar style="auto" />
      <HomeScreen />
    </>
  );
}
