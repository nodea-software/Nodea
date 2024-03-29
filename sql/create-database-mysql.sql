-- CREATE NODEA DATABASE FOR MySQL

DROP DATABASE IF EXISTS nodea;
CREATE DATABASE nodea
  DEFAULT CHARACTER SET utf8
  DEFAULT COLLATE utf8_general_ci;

CREATE USER IF NOT EXISTS 'nodea'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'N0d3@_S0ftw@re';
CREATE USER IF NOT EXISTS 'nodea'@'%' IDENTIFIED WITH mysql_native_password BY 'N0d3@_S0ftw@re';
GRANT ALL PRIVILEGES ON *.* TO 'nodea'@'127.0.0.1' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'nodea'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;