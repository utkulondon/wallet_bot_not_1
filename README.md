# Wallet Bot - Multi-Chain Trading Bot

A powerful Telegram bot that supports multiple blockchain networks (Solana and TON) for wallet management, trading, and price alerts.

## Features

- **Multi-Chain Support**: Manage wallets on Solana and TON blockchains
- **Wallet Management**: Create, import, and manage crypto wallets
- **Trading Functionality**: Execute trades on supported DEXes
- **Price Tracking**: Monitor cryptocurrency prices in real-time
- **Price Alerts**: Set up custom price alerts for various tokens
- **User-Friendly Interface**: Intuitive Telegram bot interface with button navigation

## Technology Stack

- **Backend**: Node.js
- **Database**: MongoDB
- **Blockchain Integrations**:
  - Solana: @solana/web3.js, @solana/spl-token
  - TON: @ton/ton, @ton/core, @ton/crypto, tonweb
- **DEX Integrations**:
  - Solana: Jupiter API
  - TON: STON.fi
- **Bot Framework**: Telegraf
- **Logging**: Winston

## Project Structure

```
wallet_bot/
├── config/             # Configuration files
├── logs/               # Application logs
├── scripts/            # Utility scripts
├── src/
│   ├── bot/            # Telegram bot handlers
│   ├── chains/         # Blockchain-specific implementations
│   │   ├── solana/     # Solana blockchain integration
│   │   └── ton/        # TON blockchain integration
│   ├── models/         # Database models
│   ├── services/       # Business logic services
│   ├── utils/          # Helper utilities
│   └── index.js        # Application entry point
└── tests/              # Test files
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Telegram Bot Token (from BotFather)
- RPC endpoints for Solana and TON

### Installation

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
MONGODB_URI=your_mongodb_connection_string
SOLANA_RPC_URL=your_solana_rpc_url
TON_RPC_URL=your_ton_rpc_url
TON_API_KEY=your_ton_api_key
TRADING_API_URL=your_trading_api_url
NODE_ENV=production
TON_API_ENDPOINT=your_ton_api_endpoint
STON_FI_ENDPOINT=your_ston_fi_endpoint
STON_FI_ROUTER_ADDRESS=your_ston_fi_router_address
STON_FI_DEST_ADDRESS=your_ston_fi_dest_address
PTON_TON_TRANSFER_OP_CODE=your_pton_ton_transfer_op_code
```

## Usage

1. Start a chat with your bot on Telegram
2. Use the `/start` command to begin
3. Select your preferred blockchain network (Solana or TON)
4. Follow the on-screen instructions to create or import a wallet
5. Use the menu options to manage your wallet, trade tokens, set price alerts, etc.

## Acknowledgements

- [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
- [TON SDK](https://github.com/ton-community/ton)
- [Telegraf](https://github.com/telegraf/telegraf)
- [Jupiter Aggregator](https://jup.ag/)
- [STON.fi](https://ston.fi/)
