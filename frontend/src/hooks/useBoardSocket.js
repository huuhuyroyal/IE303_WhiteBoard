import { useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';

export default function useBoardSocket() {
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new SockJS('http://localhost:5000/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => setConnected(true),
      onWebSocketClose: () => setConnected(false),
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      setConnected(false);
      client.deactivate();
    };
  }, []);

  return useMemo(() => ({ clientRef, connected }), [connected]);
}
