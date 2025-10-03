# SuperCash - Next-Generation Payment System on Aptos

<div align="center">

![Aptos Logo](supercash_logo.png)

[![Built with Aptos](https://img.shields.io/badge/Built_with-Aptos-blue?style=for-the-badge&logo=aptos)](https://aptoslabs.com/)
[![Move Contract](https://img.shields.io/badge/Smart_Contract-Move-green?style=for-the-badge)](https://github.com/move-language/move)
[![TypeScript](https://img.shields.io/badge/Frontend-TypeScript-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

_Revolutionizing Global Payments on the Aptos Blockchain_

</div>

## About SuperCash

SuperCash is a revolutionary global payment and financial services platform built on the Aptos blockchain. Our platform leverages Aptos's parallel execution capabilities to deliver blazing-fast transfers, innovative real-time money streaming, and comprehensive multi-stablecoin support.

### 🎯 Key Problems We Solve

1. **Speed & Scalability**: Traditional blockchain payments are slow and expensive
2. **Payment Flexibility**: Limited options for scheduled and streaming payments
3. **Cross-border Friction**: Complex international transfer processes
4. **Stablecoin Integration**: Lack of unified multi-token payment solutions

### 💡 Our Solution

SuperCash brings together cutting-edge blockchain technology and traditional finance features:

- ⚡ **160,000+ TPS**: Utilizing Aptos's Block-STM for parallel execution
- 🌐 **Global Reach**: Borderless payments with multi-currency support
- 🔐 **Enhanced Privacy**: Secure link-based transfers with cryptographic privacy
- 💹 **Real-time Streaming**: Revolutionary money streaming capabilities

## Features

### Core Payment Features
- 🚀 **Blazing Fast Transfers**: Sub-second transaction completion
- 🔗 **Link-Based Transfers**: Send payments via secure links
- **Multi-Token Support**: APT, USDC, PYUSD0, USDT with extensible architecture
- ⚡ **Parallel Execution**: Leverages Aptos' parallel transaction processing
- 🔒 **Privacy-Preserving**: Cryptographic commitments for link privacy

### Money Streaming
- 💫 **Real-time Streaming**: Continuous fund flows by the second
- ⏸️ **Pause/Resume**: Flexible stream control
- 🎯 **Cliff Periods**: Optional vesting cliffs
- 📊 **Live UI**: Real-time balance updates
- 🔧 **Flexible Rates**: Configure by second, hour, day, week, or month

## 💰 Supported Tokens

| Token | Type | Status | Decimals | Description |
|-------|------|---------|----------|-------------|
| APT   | Coin | Active  | 8        | Native Aptos token |
| USDC  | FA   | Configurable | 6    | USD Coin |
| PYUSD | FA   | Configurable | 6    | PayPal USD |
| USDT  | FA   | Configurable | 6    | Tether USD |

## 🏗️ Project Structure

```
supercash/
├── docs/                    # Project documentation
├── supercash-contract/     # Smart contract implementation
│   ├── sources/            # Move source files
│   ├── tests/              # Contract test files
│   └── examples/           # Usage examples
└── supercashhq/           # Frontend application
    ├── src/
    │   ├── components/     # React components
    │   ├── hooks/         # Custom React hooks
    │   ├── pages/         # Application pages
    │   └── sdk/           # TypeScript SDK
    └── public/            # Static assets
```

## 🔧 Technology Stack

- **Blockchain**: Aptos Network
- **Smart Contracts**: Move Language
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm

## 🚀 Quick Start

### Smart Contract Development

```bash
cd supercash-contract
aptos move compile
aptos move test
aptos move publish --profile dev
```

### Frontend Development

```bash
cd supercashhq
pnpm install
pnpm dev
```

## 📚 Documentation

- [Smart Contract Guide](supercash-contract/docs_deprecated/SMART_CONTRACT_DEVELOPER_GUIDE.md)
- [Frontend Developer Guide](supercash-contract/docs_deprecated/FRONTEND_DEVELOPER_GUIDE.md)
- [Money Streaming Guide](docs/STREAMING.md)
- [Function Reference](supercash-contract/docs_deprecated/FUNCTION_REFERENCE.md)
- [Deployment Guide](supercash-contract/docs_deprecated/DEPLOYMENT_GUIDE.md)

## 🎯 Use Cases

### For Businesses
- � **Payroll Management**: Streamline salary payments with real-time streaming
- 🤝 **Vendor Payments**: Instant settlements with multiple vendors
- 📈 **Subscription Services**: Automated recurring payments
- 🌐 **Cross-border Transactions**: Efficient international payments

### For Individuals
- 💸 **Instant Transfers**: Send money globally in seconds
- 📱 **Link Payments**: Share payment links with anyone
- 💫 **Income Streaming**: Receive earnings in real-time
- 🔄 **Token Swaps**: Easy conversion between supported tokens

## 🏆 Competitive Advantages

### Technical Excellence
- 🚀 **Superior Performance**: 160,000+ TPS with sub-second finality
- 🛡️ **Advanced Security**: Cryptographic privacy and formal verification
- ⚡ **Parallel Execution**: Efficient resource utilization
- 🔄 **Multi-token Support**: Seamless integration of major stablecoins

### User Experience
- 📱 **Intuitive Interface**: Clean, modern UI/UX design
- 🎯 **Smart Features**: Automated scheduling and streaming
- 💡 **Flexible Options**: Multiple payment methods and tokens
- 🌐 **Global Access**: Available worldwide 24/7

## ✨ Acknowledgments

- Built with ❤️ on [Aptos](https://aptoslabs.com/)