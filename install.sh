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
	cd ..
fi

if [[ "$OSTYPE" == "linux-gnu" ]]; then
	echo "Linux OS"
	#Create mysql database
	echo "Starting database creation..."
	echo "Please, enter mysql root password: "
	mysql -u root -p < sql/create-database.sql > error.log
	echo "Nodea database created."
elif [[ "$OSTYPE" == "darwin"* ]]; then
	# Mac OSX
	echo "Mac OSX"
	echo "Linux OS"
	#Create mysql database
	echo "Starting database creation..."
	mysql -u root -p < sql/create-database.sql > error.log
	echo "Nodea database created."
elif [[ "$OSTYPE" == "msys" ]]; then
	# Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
	echo "Windows OS"

	echo "Please type the mysql.exe path (Example : c:/wamp/bin/mysql/mysql5.6.17/bin/mysql.exe):"
	read mysqlpath

	echo "Do you have a root password ? (If you are using WAMP you shouldn't have one) type 'Y' or 'N'"
	read havePass

	#Create mysql database
	echo "Starting database creation."

	if [[ "$havePass" == "Y" ]]; then
		echo "Please type your mysql root password:"
		read rootPass
		$mysqlpath -u root -p$rootPass < sql/create-database.sql > error.log
	else
		$mysqlpath -u root < sql/create-database.sql > error.log
	fi

	echo "Nodea database created."

elif [[ "$OSTYPE" == "win32" ]]; then
	# I'm not sure this can happen.
	echo "win32"
	echo "Windows OS"
	echo "Please type the mysql.exe path (Example : c:/wamp/bin/mysql/mysql5.6.17/bin/mysql.exe):"
	read mysqlpath

	#Create mysql database
	echo "Starting database creation..."
	$mysqlpath -u root -p < sql/create-database.sql > error.log

	echo "Nodea database created."
else
	echo "Sorry, we can't recognize your Operating System :("
fi

echo "Nodea ready to be started -> node server.js"
