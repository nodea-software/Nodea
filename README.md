<p align="center">
	<img width="300" height="125" src="https://www.nodea-software.com/img/logo/logo_nodea_color.png">
</p>

# NODEA

NODEA is a computer aided software that enable to generate Node.js applications by giving instructions to a bot.<br>
Official website: https://nodea-software.com
Official documentation: https://docs.nodea-software.com

## Classic Installation

### Prerequisites

Node.js LTS / Fermium (v14 or later)<br>
MySQL (5.7 or higher) / MariaDB (v10 or higher) or PostgreSQL server installed and running.

### Instructions

git clone: <pre>git clone git@github.com:nodea-software/nodea.git</pre>

### Installation with shell

Execute the following instructions:<br/>
<pre>
cd nodea
chmod +x install.sh
bash install.sh
</pre>

### Manual installation

If it does not work then follow these steps:

Use .sql file that are in sql/ directory to generate the database, there are 3 files for each available dialect (MariaDB, MySQL, Postgres)

Note that MariaDB is the default dialect, if you want to change please update the dialect key in config/database and structure/template/config/database.js

Execute <b>npm install</b>

### Launch server

Follow the instructions and wait for message :<br>
<i>Nodea ready to be started -> node server.js</i>

Then, execute command line :
<pre>
node server.js
</pre>

Open your browser on:<br>
http://127.0.0.1:1337<br>
Set your password on the first connection page:<br>
http://127.0.0.1:1337/first_connection?login=admin&email:admin@local.fr<br><br>
The default generator login is: <b>admin</b><br>
The default generator email is: <b>admin@local.fr</b>

Note : to generate your first application, ports <i>9000</i> and <i>9001</i> must be available on your computer.

## Docker Installation

### Prerequisites

Docker and Docker compose installed

### Instructions

Create (and adapt if necessary) "docker-compose.yml" file:

<pre>
version: '3.3'

services:
  nodea:
    container_name: nodea_app
    image: nodeasoftware/nodea:latest
    links:
      - "database:database"
    ports:
      - "1337:1337"
      - "9001-9025:9001-9025" # 25 applications max, you can increase to 9100 for 100 applications if necessary
    networks:
      - nodea_network
    volumes:
      - app:/app
    environment:
      NODEA_ENV: "develop"
      SERVER_IP: "127.0.0.1"
      DATABASE_IP: "database"
      DATABASE_USER: "nodea"
      DATABASE_PWD: "nodea"
      DATABASE_NAME: "nodea"
  database:
    container_name: nodea_database
    image: nodeasoftware/nodea-database-mariadb:latest # nodea-database-mysql || nodea-database-mariadb || nodea-database-postgres
    networks:
      - nodea_network
    volumes:
      - db_data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: nodea
      MYSQL_DATABASE: nodea
      MYSQL_USER: nodea
      MYSQL_PASSWORD: nodea

networks:
  nodea_network:

volumes:
  db_data:
  app:
</pre>

Execute Docker compose command:
<pre>sudo docker-compose up -d</pre>

Wait about 30 seconds and open your browser on:<br>
http://127.0.0.1:1337<br>
Set your password on the first connection page:<br>
http://127.0.0.1:1337/first_connection?login=admin&email:admin@local.fr<br><br>
The default generator login is: <b>admin</b><br>
The default generator email is: <b>admin@local.fr</b>

Note: to set up Nodea docker containers, range ports <i>9001</i> to <i>9025</i> must be available on your computer.

## Documentation

Nodea Software documentation is available at : https://docs.nodea-software.com

## Follow us

<ul>
<li><a href="https://www.linkedin.com/company/nodea-software/">LinkedIn</a></li>
</ul>

## License

Nodea is released under the GNU GPL v3.0 license.
It contains several open source components distributed under the MIT, BSD or GNU GPL V3.0 licenses.