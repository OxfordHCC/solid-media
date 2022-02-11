# CSS (Solid Community Server) Set up Notes and Instructions

This file contains the notes and instructions on setting up the CSS on a server. It is based on the experience with Ubuntu 20.04.

	The most notable reason why Ubuntu or any Linux distro version matters is the node.js version come with the distro. CSS requires node.js 12.7 (see [ref](https://github.com/solid/community-server#-running-the-server)). This document contains the instructions on upgrading the node.js version (because Ubuntu 20.04 comes with node.js 10.19).

This document contains four major steps:

1. Building and Running CSS
2. Setting up the web server
3. Pairing web server to CSS (reverse proxy)
4. Testing CSS with different configurations / default apps

They are introduced below. Better sectioning may be provided later.

	HTTPS is necessary for Solid ecosystem to work correctly. In this document, we will use Let's Encrypt to obtain a certificate. A valid DNS record is needed for this.

## Set up instructions

This document assumes the domain name for your server is: `DOMAIN.NAME`. Remember to replace it with the actual value.

### Setting up CSS

Depending on your preference, you may choose to install CSS from npm repository or to build from source. See the [official document](https://github.com/solid/community-server#-running-the-server) for more details. This section chooses to install CSS from npm repository. 

Step 1: Install `nvm` ([Node Version Manager](https://github.com/nvm-sh/nvm)):
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

Step 2: Load `nvm` into your shell environment. Restart your shell or use the command below:
```
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

Step 3: Install a supported node.js version (`16.13.2` in our example)

```
nvm install 16.13.2
```

Step 4: Download CSS from npm repository:

```
npm install @solid/community-server
```

Note that this command installs everything under your current directory. This may or may not be what you want. Add `-g` switch to install it globally.

Step 5: Try starting CSS to verify it works:

```
npx community-solid-server
```

This launches CSS and exposes the service to `http://localhost:3000`. Visit the URL to verify it works correctly.

There is no need to make configurations at this stage, because the default configuration will not save data to disk.

### Set up web server (and SSL certificate)

#### Install nginx
```
apt-get update && apt-get install -nginx
```

Remember to answer `y` to the confirmation.

#### Allow nginx service to pass firewall

```
ufw allow 'Nginx Full'
```

This is specifically for Ubuntu, using the `ufw` command.

#### Verify nginx works

You may want to check nginx works in the first place. This is purely optional, but will help you discover problems if any.

The easiest method is to edit the server configuration located under `/etc/nginx/sites-available/default`, and update the `server_name` field with your actual domain name.

```
server_name DOMAIN.NAME;
```

Then, restart nginx:

```
systemctl restart nginx
```

Visit `http://DOMAIN.NAME` to check if you can see the nginx's default welcome page.

#### Obtain HTTPS certificate

We use Let's Encrypt for this purpose. The commandline application is named `certbot`. We need to install it first:

```
apt-get install certbot
```

Then, get the certificate through it:

```
certbot -d DOMAIN.NAME -d *.DOMAIN.NAME --manual --preferred-challenges dns certonly
```

You will be prompted with what to do:
1. Agree on the terms and provide basic information.
2. Set up DNS TXT records to verify that domain name is yours. Your need to do this twice, as two separete records (this is allowed), not to replace the old one.

After the successful execution, you will be issued the certificate, located under `/etc/letsencrypt/DOMAIN.NAME/`.

#### Configure nginx with HTTPS

We now need to configure nginx to accept incoming HTTPS connections. We will use the tool provided by Let's Encrypt to automatically modify nginx configuration.

A dependency is needed:

```
apt-get install python3-certbot-nginx
```

Then we execute this command to automatically update nginx config:

```
certbot --nginx -d DOMAIN.NAME -d *.DOMAIN.NAME
```

Follow the prompts. It will modify your chosen nginx configurations.

If you are doing a fresh installation and followed this tutorial, restart nginx and then check HTTPS works from your browser:

```
systemctl restart nginx
```

### Pair web server with CSS

There are two configurations needed:

1. Set up reverse proxy in the web server to CSS (`http://localhost:3000`)
2. Configure CSS to accept the proxyed connection.

We will describe how to do that with nginx.

#### Set up reverse proxy

CSS's official site gives an [example configuration instruction for setting up reverse proxy in nginx](https://solidproject.org/self-hosting/css/nginx). The instruction here is derived from it, because we are not rewriting the server configuration from scratch.

The key parts are these two sections:
- `upstream`
- `location / {`

Simply copy the `upstream` part to your server configuration file (e.g. `/etc/nginx/sites-available/default`, if you followed the instructions above). You can place it anywhere outside of (or before?) `server{}` blocks. We placed it in the beginning.

The second action is to navigate to the `location /` section inside the `server{}` block (with port 443, i.e. the one for HTTPS). Then, copy the section content (within `location / { }`) from the example configuration to your configuration (also within `location / { }`), replacing everything originally there.

Now you have finished nginx configuration. The `/etc/nginx/snippets/https.conf` file mentioned in the example configuration is not needed, because it is covered by `certbot` already. (Though, to be precise, a few settings listed in that example are not covered by certbot's automatic configuration.)

You can navigate to `https://DOMAIN.NAME` from your browser, and you will see the solid web page.

You will probably see some error messages on the web page. This is expected, because we also need to do the next step.

#### Change CSS settings

The CSS service needs to be started to accept connections from the reverse proxy. This shall be done by specifying the domain name, through the `-b` (or `--baseUrl`) parameter: `-b https://DOMAIN.NAME/`.

You may also want to persist your data somewhere. This can be done by specifying the correct configuration file with a directory. For example, you can add `-c @css:config/file.json -f ~/Documents/` to tell CSS to load the (internal) configuration `config/file.json`, and save data to `~/Documents/` directory.

Therefore, we should stop the previous CSS service, and start it again with these parameters added:

```
npx community-solid-server -b https://DOMAIN.NAME/ -c @css:config/file.json -f ~/Documents/
```

After launching, we can navigate to `https://DOMAIN.NAME/` in the browser, and finish the rest of the initialisation.

### Setting different default apps for CSS

With the steps above, you will notice that Solid is up and running, but you can not do much interesting things on the web page. This is because CSS is meant to be modular and only provides the most basic functionalities. It provides the core functionalities of Solid, and you can use any [Solid Apps](https://solidproject.org/apps) with it.

Instead of the simple CSS, we may also want to provide a *default app* for it, such as the [mashlib data browser](https://github.com/solid/mashlib). This section describes how to do this.

We can find existing *recipes* for doing this in the [CSS recipes repository](https://github.com/solid/community-server-recipes). It contains the instructions of basic usages. We need to follow the installation guide first, and do something slightly different when running the server -- this is to match our parameters above.

We choose to use mashlib, and the command to launch CSS (with mashlib recipe) is:

```
npx community-solid-server -b https://DOMAIN.NAME/ -c config-mashlib.json -f ~/Documents/
```

## Troubleshooting

### Invalid request

Sometimes you will encounter an invalid request page when visiting some links (e.g. sign up):

```
InvalidRequest: invalid_request
```

This is because the URL does not correctly have `/` at the end. For example, you may be visiting `https://DOMAIN.NAME/idp/register`, but in fact you should visit `https://DOMAIN.NAME/idp/register/`. Manually fixing the URL can overcome the issue (temporarily).

This is fixed by [this pull request](https://github.com/solid/community-server/pull/1107), but is not yet included in the npm version of the CSS.