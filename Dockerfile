FROM node:fermium-bullseye-slim
LABEL maintainer.name="Nodea" maintainer.email="contact@nodea-software.com"

# Clean node_modules && workspace for image creation
RUN rm -rf node_modules/ && rm -rf workspace/

# Update package and install needed module
RUN apt-get update && apt-get -qq -y install pdftk && apt-get -y install nano && apt-get -y install git && apt-get -y install mariadb-client-10.5 && apt-get -y install python3 && apt-get -y install libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 libgbm-dev

# Main folder
RUN mkdir /nodea
WORKDIR /nodea
COPY . /nodea

# Workspace folder
RUN mkdir -p /nodea/workspace
COPY /structure/template/package.json /nodea/workspace

# Expose Nodea and workspace ports
EXPOSE 1337 9001-9100

# Entrypoint
RUN chmod 777 /nodea/entrypoint.sh
ENTRYPOINT ["/nodea/entrypoint.sh"]