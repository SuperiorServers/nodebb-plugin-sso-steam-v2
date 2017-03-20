define('admin/plugins/sso-steam', ['settings'], function(Settings) {
	'use strict';
	/* globals $, app, socket, require */

	var ACP = {};

	ACP.init = function() {
		Settings.load('sso-steam', $('.sso-steam-settings'));

		$('#save').on('click', function() {
			Settings.save('sso-steam', $('.sso-steam-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'sso-steam-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});