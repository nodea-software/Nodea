#!/bin/bash

if [[ "$NODEA_ENV" == "studio" ]]; then

	# Setup for ssh onto github
	# mkdir -p /root/.ssh
	# id_rsa /root/.ssh/id_rsa
	# chmod 700 /root/.ssh/id_rsa
	# ssh_config /root/.ssh/config

	# Set Git user and email
	git config --global user.name "$HOSTNAME"
	git config --global user.email "$SUB_DOMAIN@$DOMAIN_STUDIO"

	# Write SSH Config file
	printf "Host gitlab.%s\n	Port 2222\n	StrictHostKeyChecking no\n" "$DOMAIN_STUDIO" > /root/.ssh/config
	eval "$(ssh-agent -s)"
	# ssh-add ~/.ssh/id_rsa
fi

# Install generator and application node_modules
chmod +x install_modules.sh
./install_modules.sh

node server.js