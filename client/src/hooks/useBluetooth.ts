/**
 * ═══════════════════════════════════════════════════════════════
 *  useBluetooth Hook — Web Bluetooth API for BLE Proximity
 *
 *  This hook provides a browser-based BLE scanning demo.
 *  For real mobile deployment, replace with react-native-ble-plx:
 *
 *  import { BleManager } from 'react-native-ble-plx';
 *  const bleManager = new BleManager();
 *  bleManager.startDeviceScan(null, null, (error, device) => {
 *    if (device) console.log(device.rssi);
 *  });
 *
 *  💡 iOS Foreground Service Tip:
 *  Mobile OS restrictions (iOS especially) are strict about
 *  background Bluetooth. Use a Foreground Service to keep the
 *  BLE scanner active while the professor takes attendance.
 *  On iOS, enable "Uses Bluetooth LE accessories" background
 *  mode in Info.plist.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';

interface BluetoothState {
  isSupported: boolean;
  isScanning: boolean;
  rssi: number | null;
  deviceName: string | null;
  sessionToken: string | null;
  error: string | null;
}

export function useBluetooth() {
  const [state, setState] = useState<BluetoothState>({
    isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    isScanning: false,
    rssi: null,
    deviceName: null,
    sessionToken: null,
    error: null,
  });

  /**
   * Scan for the classroom BLE beacon.
   *
   * Web Bluetooth API requires user gesture to trigger.
   * Note: Web Bluetooth does NOT expose RSSI directly. In a real
   * React Native app, RSSI comes from the BLE scan callback.
   * This demo uses simulation for RSSI values.
   *
   * In production React Native code:
   * ```
   * bleManager.startDeviceScan(null, null, (error, device) => {
   *   if (device) {
   *     const rssi = device.rssi; // Real RSSI from hardware
   *     const token = extractTokenFromAdvertisement(device);
   *   }
   * });
   * ```
   */
  const scanForBeacon = useCallback(async () => {
    if (!('bluetooth' in navigator)) {
      setState(prev => ({
        ...prev,
        error: 'Web Bluetooth not supported. Use Chrome on a device with Bluetooth.',
      }));
      return;
    }

    setState(prev => ({ ...prev, isScanning: true, error: null }));

    try {
      // Request any Bluetooth device for demo purposes
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service'],
      });

      setState(prev => ({
        ...prev,
        isScanning: false,
        deviceName: device.name ?? 'Unknown Device',
        // Simulated RSSI — real value comes from react-native-ble-plx
        rssi: null,
        sessionToken: null,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: `Bluetooth scan failed: ${(err as Error).message}`,
      }));
    }
  }, []);

  /**
   * Simulate BLE proximity for demo purposes.
   * In production, RSSI comes directly from the BLE scan callback.
   */
  const simulateProximity = useCallback((rssi: number, sessionToken: string) => {
    setState(prev => ({
      ...prev,
      rssi,
      sessionToken,
      error: null,
    }));
  }, []);

  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      deviceName: null,
      rssi: null,
      sessionToken: null,
    }));
  }, []);

  return {
    ...state,
    scanForBeacon,
    simulateProximity,
    disconnect,
  };
}
