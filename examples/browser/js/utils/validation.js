export const isValidHostname = (str) => {
	if (typeof str !== 'string' || str.length < 1) {
		return false;
	}
	if (/:(\d+)?$/.test(str)) {
		return false;
	}
	return isValidHostnameAndPort(str);
};

export const isValidHostnameAndPort = (str) => {
	if (typeof str !== 'string' || str.length < 1) {
		return false;
	}

	try {
		const url = new URL(`http://${str}/`);

		// reject if any part other than hostname or port is present
		if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
			return false;
		}

		// host must exist
		if (!url.hostname) {
			return false;
		}

		// check port range if present
		if (url.port) {
			const port = +url.port;
			if (port < 1 || port > 65535) {
				return false;
			}
		}
	} catch {
		return false;
	}
	return true;
};
