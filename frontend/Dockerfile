FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

EXPOSE 5173

# Start Vite dev server on 0.0.0.0 to allow host access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]