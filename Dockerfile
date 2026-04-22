# Use an official Node.js runtime as a base image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Step 1: Getting the Global Tools
# Install NPM
RUN npm install -g npm@7.16.0

# Install the dev tools - yo, bower, grunt
RUN npm install -g yo bower grunt-cli

# Install generator for Angular
RUN npm install -g generator-angular

# Step 2: Installing Project Dependencies
# Copy package.json and package-lock.json to leverage Docker cache
#COPY package*.json ./
#COPY bower.json ./
COPY . .
RUN npm install

# Run npx bower install
RUN npx bower install --allow-root

# Step 3: Running it Locally
# Expose the port used by the application
EXPOSE 8080

# Run npx grunt server
CMD ["npx", "grunt", "server"]

# Step 4: Build
# Run npx grunt build --force
# Note: The --force flag is used to force the build even if there are warnings
RUN npx grunt build --force

# Step 5: Clean up existing build
# Run npx grunt clean
# Run npx bower clean
RUN npx grunt clean && npx bower cache clean --allow-root
