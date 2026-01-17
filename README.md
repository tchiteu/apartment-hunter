# 🏠 Apartment Hunter

A smart web scraper that monitors OLX Brazil for new apartment listings and sends real-time notifications via Telegram.

## Features

- **Automated Monitoring** - Runs on a configurable schedule using cron jobs
- **Smart Filtering** - Filter apartments by neighborhood/location
- **Instant Notifications** - Get Telegram alerts the moment new listings appear
- **Anti-Detection** - Uses Puppeteer Stealth to bypass bot detection
- **Persistent Storage** - Tracks seen listings to avoid duplicate notifications
- **Detailed Logging** - JSON-based logging system for debugging and monitoring

## Tech Stack

- **Node.js** - Runtime environment
- **Puppeteer Extra** - Web scraping with stealth capabilities
- **node-cron** - Job scheduling
- **Telegram Bot API** - Real-time notifications

## Quick Start

### Prerequisites

- Node.js 18+
- A Telegram Bot (create one via [@BotFather](https://t.me/BotFather))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/apartment-hunter.git
cd apartment-hunter

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your settings
```

### Running

```bash
# Start the scraper
npm start

# Or with PM2 for production
pm2 start src/index.js --name apartment-hunter
```

## How It Works

1. **Scrape** - Fetches apartment listings from OLX
2. **Filter** - Applies location filters to match your criteria
3. **Compare** - Checks against previously seen listings
4. **Notify** - Sends new listings to your Telegram
5. **Store** - Saves listings to prevent duplicates
6. **Repeat** - Waits for the next scheduled run

## Sample Notification

```
🏠 New Apartment!

📍 Location: Joinville, Centro
💰 Price: R$ 1.800
📐 Area: 70 m²
📝 Title: 2 bedroom apartment downtown

🔗 View listing
```

## Deployment

### AWS EC2 / Lightsail

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs chromium-browser

# Clone and setup
git clone your-repo && cd apartment-hunter
npm install && cp .env.example .env

# Run with PM2
npm install -g pm2
pm2 start src/index.js --name apartment-hunter
pm2 save && pm2 startup
```