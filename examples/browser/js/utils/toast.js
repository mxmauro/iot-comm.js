import Toastify from 'toastify';

// -----------------------------------------------------------------------------

export const showToast = (message, type, cb) => {
	let backgroundColor = '#444';

	switch (type) {
		case 'error':
			backgroundColor = '#D93526';
			break;
		case 'warn':
			backgroundColor = '#E8D600';
			break;
		case 'success':
			backgroundColor = '#47A417';
			break;
		case 'info':
			backgroundColor = '#029AE8';
			break;
	}

	Toastify({
		text: message,
		duration: 3000,
		gravity: 'bottom',
		position: 'right',
		stopOnFocus: true,
		style: {
			color: '#fff',
			background: backgroundColor,
			boxShadow: 'none'
		},
		onClick: () => {
			if (cb) {
				cb();
			}
		}
	}).showToast();
};
