#!/bin/bash

# Install Nodea generator node modules
if [ ! -d "./node_modules" ]; then
	echo "INSTALLING GENERATOR NODE MODULES..."
	npm install
fi

# Create workspace dir
if [ ! -d "./workspace" ]; then
	echo "GENERATE WORKSPACE DIRECTORY..."
	mkdir workspace
	chmod 755 -R workspace
fi

# Install Nodea structure template
if [ ! -d "./workspace/node_modules" ]; then
	echo "INSTALLING WORKSPACE NODE MODULES..."
	cp structure/template/package.json workspace/
	cd workspace
	npm install
fi

# echo "INSTALLING PHANTOMJS GLOBALY..."
# npm install -g phantomjs-prebuilt