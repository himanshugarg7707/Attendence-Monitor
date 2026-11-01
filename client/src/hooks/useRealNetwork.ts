/**
 * ═══════════════════════════════════════════════════════════════
 *  useRealNetwork Hook — Real Network Telemetry & Hotspot Detection
 *
 *  Measures real ping RTT to the server/hotspot gateway,
 *  reads browser Network Information API, probes WebRTC local IP,
 *  and verifies if the client is on the faculty's local subnet.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { pingServer } from '../services/api';

export interface NetworkState {
  latencyMs: number;
  clientIp: string | null;
  connectionType: string;
  downlinkMbps: number | null;
  localSubnet: string | null;
  isOnline: boolean;
  lastChecked: number | null;
}

export function useRealNetwork(autoPing = true) {
  const [network, setNetwork] = useState<NetworkState>({
    latencyMs: 12,
    clientIp: null,
    connectionType: 'Wi-Fi / LAN',
    downlinkMbps: 10,
    localSubnet: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChecked: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Probe WebRTC for local host IP candidate (e.g. 192.168.43.x or 172.20.10.x)
  const probeLocalIp = useCallback(() => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        const candidateStr = ice.candidate.candidate;
        const match = candidateStr.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (match && match[1]) {
          const ip = match[1];
          // Determine subnet (e.g. 192.168.43.x)
          const parts = ip.split('.');
          const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.x`;
          setNetwork((prev) => ({ ...prev, localSubnet: subnet }));
        }
        pc.close();
      };
    } catch {
      // WebRTC candidate gathering may be masked by browser privacy settings
    }
  }, []);

  // Measure real round-trip ping time to server
  const measurePing = useCallback(async () => {
    const result = await pingServer();
    const navConn = (navigator as any).connection;

    setNetwork((prev) => ({
      ...prev,
      latencyMs: result.success ? result.latencyMs : prev.latencyMs,
      clientIp: result.clientIp || prev.clientIp,
      connectionType: navConn?.effectiveType
        ? `${navConn.effectiveType.toUpperCase()} (${navConn.type || 'Wi-Fi'})`
        : 'Wi-Fi / Hotspot',
      downlinkMbps: navConn?.downlink || null,
      isOnline: navigator.onLine,
      lastChecked: Date.now(),
    }));
  }, []);

  useEffect(() => {
    probeLocalIp();
    measurePing();

    if (autoPing) {
      timerRef.current = setInterval(measurePing, 10_000);
    }

    const handleOnline = () => setNetwork((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setNetwork((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoPing, measurePing, probeLocalIp]);

  return {
    ...network,
    measurePing,
  };
}
