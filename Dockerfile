FROM node:fermium
MAINTAINER Nodea contact@nodea-software.com

# Clean node_modules && workspace for image creation
RUN rm -rf node_modules/
RUN rm -rf workspace/

# Update package and install needed module
RUN apt-get update && apt-get -qq -y install pdftk && apt-get -y install nano && apt-get -y install mysql-client

# Main folder
RUN mkdir /app
WORKDIR /app
COPY . /app

# Workspace folder
RUN mkdir -p /app/workspace
COPY /structure/template/package.json /app/workspace

# Expose Nodea and workspace ports
EXPOSE 1337 9001-9100

# Entrypoint
RUN chmod 777 /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]