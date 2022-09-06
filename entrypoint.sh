#!/bin/bash

if [[ "$NODEA_ENV" == "studio" ]]; then

	# Set Git user and email
	git config --global user.name "$SUB_DOMAIN.$DOMAIN_STUDIO"
	git config --global user.email "$SUB_DOMAIN@$DOMAIN_STUDIO"

	# Write SSH Config file
	printf "Host gitlab.%s\n	Port 2222\n	StrictHostKeyChecking no\n" "$DOMAIN_STUDIO" > /root/.ssh/config
	eval "$(ssh-agent -s)"
fi

# Install generator and application node_modules
chmod +x install_modules.sh
./install_modules.sh

# https://github.com/marcbachmann/node-html-pdf/issues/437#issuecomment-467463285
npm link phantomjs-prebuilt

node server.js