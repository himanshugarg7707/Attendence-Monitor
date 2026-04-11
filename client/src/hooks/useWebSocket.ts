/**
 * useWebSocket Hook — Real-time connection to professor's dashboard.
 * Handles connection lifecycle, auto-reconnect, and event parsing.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DashboardEvent, StudentVerifiedPayload } from '../types';

const WS_BASE = 'ws://localhost:3001';

interface WebSocketState {
  isConnected: boolean;
  students: StudentVerifiedPayload[];
  sessionInfo: { sessionId: string; className: string } | null;
  error: string | null;
}

export function useWebSocket(classroomId: string | null) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    students: [],
    sessionInfo: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!classroomId) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE}/api/dashboard/ws?classroomId=${classroomId}`);

    ws.onopen = () => {
      console.log('[WS] Connected to dashboard');
      setState(prev => ({ ...prev, isConnected: true, error: null }));
    };

    ws.onmessage = (event) => {
      try {
        const data: DashboardEvent | { type: string; payload: unknown } = JSON.parse(event.data);

        switch (data.type) {
          case 'STUDENT_VERIFIED':
            setState(prev => ({
              ...prev,
              students: [...prev.students, (data as any).payload as StudentVerifiedPayload],
            }));
            break;

          case 'SESSION_STARTED':
            setState(prev => ({
              ...prev,
              sessionInfo: (data as any).payload,
              students: [],
            }));
            break;

          case 'SESSION_ENDED':
            setState(prev => ({
              ...prev,
              sessionInfo: null,
            }));
            break;

          case 'HEARTBEAT':
            // Keep-alive, no UI change needed
            break;

          case 'CONNECTED':
            console.log('[WS] Welcome:', (data as any).payload?.message);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setState(prev => ({ ...prev, isConnected: false }));

      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[WS] Attempting reconnect...');
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      setState(prev => ({
        ...prev,
        error: 'WebSocket connection error',
        isConnected: false,
      }));
    };

    wsRef.current = ws;
  }, [classroomId]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const clearStudents = useCallback(() => {
    setState(prev => ({ ...prev, students: [] }));
  }, []);

  return {
    ...state,
    clearStudents,
  };
}
