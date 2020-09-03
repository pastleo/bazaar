# bazaar

![bazaar-logo](https://i.imgur.com/mREdGIV.png)

* provides information and item exchange place
* grab forums posts and browse them via walking around
* create your own place

## `web_client`

use any static http server running on `web_client/`, then open `web_client/dev.html`

## `ws_peer`

this is a typical [phoenix](https://phoenixframework.org/) project, as a peer to let browsers find each other

## Heroku deployment

```
heroku git:remote -a HEROKU_PROJECT_NAME
git subtree push --prefix ws_peer heroku master
git push heroku `git subtree split --prefix ws_peer master`:master --force
```
