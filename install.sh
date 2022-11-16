#!/bin/bash

# Install Nodea generator node modules
if [ ! -d "./node_modules" ]; then
	echo "INSTALLING GENERATOR NODE MODULES..."
	npm install
fi

echo "What database engine are you using ? type mysql | mariadb | postgres"
read dbengine

if [[ "$dbengine" == "mysql" ]]; then
	dbfile='sql/create-database-mysql.sql'
elif [[ "$dbengine" == "mariadb"* ]]; then
	dbfile='sql/create-database-mariadb.sql'
elif [[ "$dbengine" == "postgres"* ]]; then
	echo "Sorry, we do not handle postgres engine with this installation file. Please do a manual installation."
	exit
else
	echo "Sorry, we do not handle this engine with this installation file. Please do a manual installation."
	exit
fi

if [[ "$OSTYPE" == "linux-gnu" ]]; then
	echo "Linux OS"
	# Create mysql database
	echo "Starting database creation..."
	echo "Please, enter mysql root password: "
	mysql -u root -p < $dbfile > error.log
	echo "Nodea database created."
elif [[ "$OSTYPE" == "darwin"* ]]; then
	# Mac OSX
	echo "Mac OSX"
	echo "Linux OS"
	# Create mysql database
	echo "Starting database creation..."
	mysql -u root -p < $dbfile > error.log
	echo "Nodea database created."
elif [[ "$OSTYPE" == "msys" ]]; then
	# Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
	echo "Windows OS"

	echo "Please type the mysql.exe path (Example : c:/wamp/bin/mysql/mysql5.6.17/bin/mysql.exe):"
	read mysqlpath

	echo "Do you have a root password ? (If you are using WAMP you shouldn't have one) type 'Y' or 'N'"
	read havePass

	# Create mysql database
	echo "Starting database creation..."

	if [[ "$havePass" == "Y" ]]; then
		echo "Please type your mysql root password:"
		read rootPass
		$mysqlpath -u root -p$rootPass < $dbfile > error.log
	else
		$mysqlpath -u root < $dbfile > error.log
	fi

	echo "Nodea database created!"

elif [[ "$OSTYPE" == "win32" ]]; then
	# I'm not sure this can happen.
	echo "win32"
	echo "Windows OS"
	echo "Please type the mysql.exe path (Example : c:/wamp/bin/mysql/mysql5.6.17/bin/mysql.exe):"
	read mysqlpath

	# Create mysql database
	echo "Starting database creation..."
	$mysqlpath -u root -p < $dbfile > error.log

	echo "Nodea database created!"
else
	echo "Sorry, we can't recognize your Operating System :("
	exit
fi

echo "Nodea installation successful !"
echo "You can now execute the commande: node server"
