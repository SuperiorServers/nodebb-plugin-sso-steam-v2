(function(module) {
	'use strict';

	var user = module.parent.require('./user.js'),
		db = module.parent.require('../src/database.js'),
		meta = module.parent.require('./meta'),
		passport = module.parent.require('passport'),
		passportSteam = require('passport-steam').Strategy,
		utils = require('../../public/src/utils'),
		authenticationController = module.parent.require('./controllers/authentication'),
		winston = module.parent.require('winston'),
		async = require('async');

	var constants = Object.freeze({
		'name': 'Steam',
		'admin': {
			'route': '/plugins/sso-steam',
			'icon': 'fa-steam'
		}
	});

	var Steam = {};

	function profileurl(steamid) {
		return 'https://steamcommunity.com/profiles/' + steamid;
	}

	Steam.init = function(data, callback) {
		function render(req, res, next) {
			res.render('admin/plugins/sso-steam', {});
		}
		data.router.get('/admin/plugins/sso-steam', data.middleware.admin.buildHeader, render);
		data.router.get('/api/admin/plugins/sso-steam', render);
		callback();
	};

	Steam.linkAccount = function (uid, steamid) {
		user.setUserField(uid, 'steam-sso:steamid', steamid);
		user.setUserField(uid, 'steam-sso:profile', profileurl(steamid));

		db.setObjectField('steam-sso:uid-link', steamid, uid);
		db.setObjectField('steam-sso:steamid-link', uid, steamid);
	}

	Steam.getStrategy = function (strategies, callback) {
		meta.settings.get('sso-steam', function(err, settings) {
			if (!err && settings['key']) {
				passport.use(
					new passportSteam(
					{
						returnURL: module.parent.require('nconf').get('url') + '/auth/steam/callback',
						realm: module.parent.require('nconf').get('url'),
						apiKey: settings['key'],
						passReqToCallback: true
					},

					function (req, identifier, profile, done) {
						if (req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && req.user.uid > 0) {
							Steam.linkAccount(req.user.uid, profile.id);
							return done(null, req.user);
						}

						Steam.login(profile.id, profile.displayName, profile._json.avatarfull, function(err, user) {
							if (err) {
								return done(new Error(err));
							}

							authenticationController.onSuccessfulLogin(req, user.uid);
							done(null, user);
						});
					})
				);

				strategies.push({
					name: 'steam',
					url: '/auth/steam',
					callbackURL: '/auth/steam/callback',
					icon: constants.admin.icon,
					scope: 'user:username'
				});
			}

			callback(null, strategies);
		});
	};



	Steam.getAssociation = function (data, callback) {
		Steam.getSteamidByUid(data.uid, function (err, steamid) {
			if (err) {
				return callback(err, data);
			}

			if (steamid) {
				data.associations.push({
					associated: true,
					url: profileurl(steamid),
					steamid: steamid,
					name: constants.name,
					icon: constants.admin.icon
				});
			} else {
				data.associations.push({
					associated: false,
					url: module.parent.require('nconf').get('url') + '/auth/steam',
					name: constants.name,
					icon: constants.admin.icon
				});
			}

			callback(null, data);
		})
	};

	Steam.login = function(steamid, username, avatar, callback) {
		Steam.getUidBySteamid(steamid, function(err, uid) {
			if (err) {
				return callback(err);
			}

			if (uid !== null) { // Existing User
				callback(null, {
					uid: uid
				});
			} else {// New User
				if (!utils.isUserNameValid(username)) {
					return callback('Invalid username! Your username can only contain alphanumeric letters (a-z, numbers, spaces).');
				}

				user.create({username: username}, function(err, uid) {
					if (err !== null) {
						callback(err);
					} else {
						Steam.linkAccount(uid, steamid);

						user.setUserField(uid, 'picture', avatar);

						callback(null, {
							uid: uid
						});
					}
				});
			}
		});
	};

	Steam.getUidBySteamid = function(steamid, callback) {
		db.getObjectField('steam-sso:uid-link', steamid, function(err, uid) {
			if (err !== null) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	Steam.getSteamidByUid = function(uid, callback) {
		db.getObjectField('steam-sso:steamid-link', uid, function(err, steamid) {
			if (err !== null) {
				return callback(err);
			}
			callback(null, steamid);
		});
	};

	Steam.deleteUserData = function (data, callback) {
		var uid = data.uid;
		Steam.getSteamidByUid(uid, function (err, steamid) {
			if (err !== null) {
				return callback(err);
			}

			user.auth.revokeAllSessions(uid, function() {
				db.deleteObjectField('steam-sso:uid-link', steamid);
				db.deleteObjectField('steam-sso:steamid-link', uid);

				callback(null, uid);
			});
		});
	}

	Steam.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			'route': constants.admin.route,
			'icon': constants.admin.icon,
			'name': constants.name
		});

		callback(null, custom_header);
	};

	// Add some APIs for themes to use
	Steam.addPostUserData = function (data, callback) {
		Steam.getSteamidByUid(data.uid, function (err, steamid) {
			if ((err == null) && (steamid !== null)) {
				data['steam-sso:steamid'] = steamid;
				data['steam-sso:profile'] = profileurl(steamid);
			}
			callback(null, data);
		})
	}

	module.exports = Steam;
}(module));