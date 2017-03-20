# nodebb-plugin-sso-steam-v2
NodeBB SSO Steam v2

** THIS VERSION IS NOT BACKWARD COMPATIBLE **

**v2 Updates:**
* Fixed deleting a steam linked account throwing the user into an invalid session loop
* Fixed being able to accidentally link two steam accounts to your profile
* Code cleanup and improvments
* Full size avatar is now used instead of small heavily compressed avatar
* Made steam profile link HTTPS
* Added an invalid name check and error message
* Added steam info to posts api for theme makers to use (post.user.sso-steam:steamid & post.user.sso-steam:profile)