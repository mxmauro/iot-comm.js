import { createContext } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { html } from '../utils/html.js';

// -----------------------------------------------------------------------------

const ClientContext = createContext();

// -----------------------------------------------------------------------------

export function ClientContextProvider({ children, onMessage, onClose }) {
	const [client, setClient] = useState(null);
	const listenersRef = useRef(new Set());
	const earlyBufferRef = useRef([]);
	const clientRef = useRef(null);

	const subscribe = (fn) => {
		listenersRef.current.add(fn);
		if (earlyBufferRef.current.length > 0) {
			for (const buffered of earlyBufferRef.current) {
				try {
					fn(buffered.data, buffered.client);
				} catch (err) {
					console.error('subscriber error:', err);
				}
			}
			earlyBufferRef.current = [];
		}

		return () => listenersRef.current.delete(fn);
	};

	const connect = async (hostname, username, privateKey) => {
		const opts = {
			hostname,
			username,
			privateKey
		};

		if (client) {
			throw new Error('A client is already connected');
		}
		if (!window?.iotComm?.Client) {
			throw new Error('IoT-Comm.js library was not loaded');
		}
		const _client = new window.iotComm.Client();

		const boundMessage = (data) => handleMessage(data, _client);
		const boundClose = (event) => handleClose(event, _client);

		_client.__listeners = { boundMessage, boundClose };

		_client.on('message', boundMessage);
		_client.on('close', boundClose);

		try {
			await _client.connect(opts);
		} catch (err) {
			_client.off('message', boundMessage);
			_client.off('close', boundClose);
			_client.__listeners = null;
			throw err;
		}

		setClient(_client);
	};

	const handleMessage = (data, rcvClient) => {
		// Ignore messages from stale clients
		if (clientRef.current && rcvClient !== clientRef.current) {
			return;
		}

		if (typeof onMessage === 'function') {
			try {
				if (onMessage(data, rcvClient) === true) {
					return;
				}
			} catch (err) {
				console.error('Unhandled error in onMessage:', err);
			}
		}

		const packet = {
			data,
			client: rcvClient
		};

		const listeners = listenersRef.current;
		if (listeners.size === 0) {
			if (earlyBufferRef.current.length >= 128) {
				earlyBufferRef.current.shift();
			}
			earlyBufferRef.current.push(packet);
			return;
		}

		for (const fn of listeners) {
			try {
				fn(packet.data, packet.client);
			} catch (err) {
				console.error('subscriber error:', err);
			}
		}
	};

	const handleClose = (event, closedClient) => {
		if (closedClient.__listeners) {
			closedClient.off('message', closedClient.__listeners.boundMessage);
			closedClient.off('close', closedClient.__listeners.boundClose);
			closedClient.__listeners = null;
		}

		const newEarlyBuffer = [];
		for (const buffered of earlyBufferRef.current) {
			if (buffered.client !== closedClient) {
				newEarlyBuffer.push(buffered);
			}
		}
		earlyBufferRef.current = newEarlyBuffer;

		if (clientRef.current === closedClient) {
			if (typeof onClose === 'function') {
				try {
					onClose(event, client);
				} catch (err) {
					console.error('Unhandled error in onClose:', err);
				}
			}

			setClient(null);
		}
	};

	// Ensure we clear listeners when provider unmounts or socket instance changes
	useEffect(() => {
		const activeClient = client;

		clientRef.current = client;

		return () => {
			if (activeClient) {
				if (activeClient.__listeners) {
					activeClient.off('message', activeClient.__listeners.boundMessage);
					activeClient.off('close', activeClient.__listeners.boundClose);
					activeClient.__listeners = null;
				}
				activeClient.close().catch(() => {});
			}
		};
	}, [client]);

	const value = useMemo(
		() => ({
			client,
			isConnected: !!client,
			connect,
			subscribe
		}),
		[client]
	);

	return html`
		<${ClientContext.Provider} value=${value}>
			${children}
		</${ClientContext.Provider}>
	`;
}

export function useClientContext() {
	const context = useContext(ClientContext);
	if (!context) {
		throw new Error('useClientContext must be used within ClientContextProvider');
	}
	return context;
}
