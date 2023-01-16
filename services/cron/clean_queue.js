const dayjs = require('dayjs');

module.exports = () => {
	try {
		const idx_to_remove = [];
		for (let i = 0; i < global.app_queue.length; i++) {
			const app_name = global.app_queue[i];
			if(app_name.split('_').length == 3){
				const timestamp = app_name.split('_')[2].slice(0, -3);
				const date = dayjs.unix(parseInt(timestamp));
				if(dayjs().diff(date, 'minutes') >= 10){
					console.log('CRON: REMOVING FROM QUEUE', app_name);
					idx_to_remove.push(i);
				}
			}
		}

		if(idx_to_remove.length > 0)
			global.app_queue = global.app_queue.filter((el, idx) => !idx_to_remove.includes(idx));

	} catch (err) {
		console.error(err);
	}
}