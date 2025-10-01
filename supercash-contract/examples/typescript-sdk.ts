/**
 * SuperCash TypeScript SDK
 * Example integration for frontend applications
 */

import { AptosClient, AptosAccount, TxnBuilderTypes, HexString } from "aptos";
import { SHA3 } from 'crypto-js';

// Contract configuration
const CONTRACT_ADDRESS = "0xYOUR_CONTRACT_ADDRESS";

// Token IDs
export enum TokenId {
    APT = 1,
    USDC = 2,
    PYUSD = 3,
    USDT = 4
}

// Event types for parsing
export interface DirectTransferEvent {
    sender: string;
    recipient: string;
    token_id: number;
    amount: string;
    timestamp: string;
}

export interface LinkCreatedEvent {
    sender: string;
    token_id: number;
    commitment: number[];
    amount: string;
    expiry: string;
    object_address: string;
    timestamp: string;
}

export interface LinkClaimedEvent {
    claimer: string;
    sender: string;
    token_id: number;
    amount: string;
    commitment: number[];
    timestamp: string;
}

// Link transfer data structure
export interface LinkTransferData {
    secret: Uint8Array;
    amount: number;
    nonce: number;
    expiry: number;
    senderAddr: string;
    tokenId: TokenId;
}

export class SuperCashClient {
    private client: AptosClient;
    
    constructor(nodeUrl: string) {
        this.client = new AptosClient(nodeUrl);
    }

    // === DIRECT TRANSFERS ===
    
    /**
     * Send APT directly to recipient
     */
    async directTransferAPT(
        sender: AptosAccount, 
        recipient: string, 
        amount: number
    ): Promise<string> {
        const payload = {
            type: "entry_function_payload",
            function: `${CONTRACT_ADDRESS}::payments::direct_transfer_apt`,
            type_arguments: [],
            arguments: [recipient, amount.toString()]
        };
        
        const txnRequest = await this.client.generateTransaction(sender.address(), payload);
        const signedTxn = await this.client.signTransaction(sender, txnRequest);
        const transactionRes = await this.client.submitTransaction(signedTxn);
        await this.client.waitForTransaction(transactionRes.hash);
        
        return transactionRes.hash;
    }

    /**
     * Send fungible asset tokens (USDC, PYUSD, USDT)
     */
    async directTransferFA(
        sender: AptosAccount,
        recipient: string,
        tokenId: TokenId,
        amount: number
    ): Promise<string> {
        if (tokenId === TokenId.APT) {
            throw new Error("Use directTransferAPT for APT transfers");
        }

        const payload = {
            type: "entry_function_payload",
            function: `${CONTRACT_ADDRESS}::payments::direct_transfer_fa`,
            type_arguments: [],
            arguments: [recipient, tokenId.toString(), amount.toString()]
        };
        
        const txnRequest = await this.client.generateTransaction(sender.address(), payload);
        const signedTxn = await this.client.signTransaction(sender, txnRequest);
        const transactionRes = await this.client.submitTransaction(signedTxn);
        await this.client.waitForTransaction(transactionRes.hash);
        
        return transactionRes.hash;
    }

    /**
     * Batch APT transfers to multiple recipients
     */
    async batchDirectTransferAPT(
        sender: AptosAccount,
        recipients: string[],
        amounts: number[]
    ): Promise<string> {
        if (recipients.length !== amounts.length) {
            throw new Error("Recipients and amounts arrays must have same length");
        }

        const payload = {
            type: "entry_function_payload",
            function: `${CONTRACT_ADDRESS}::payments::batch_direct_transfer_apt`,
            type_arguments: [],
            arguments: [
                recipients,
                amounts.map(a => a.toString())
            ]
        };
        
        const txnRequest = await this.client.generateTransaction(sender.address(), payload);
        const signedTxn = await this.client.signTransaction(sender, txnRequest);
        const transactionRes = await this.client.submitTransaction(signedTxn);
        await this.client.waitForTransaction(transactionRes.hash);
        
        return transactionRes.hash;
    }

    // === LINK TRANSFERS ===

    /**
     * Generate secure link transfer data
     */
    generateLinkTransfer(
        amount: number, 
        expiryHours: number, 
        senderAddr: string, 
        tokenId: TokenId = TokenId.APT
    ): { commitment: Uint8Array, link: string, transferData: LinkTransferData } {
        // 1. Generate 32-byte secret
        const secret = crypto.getRandomValues(new Uint8Array(32));
        
        // 2. Calculate expiry timestamp
        const expiry = Math.floor(Date.now() / 1000) + (expiryHours * 3600);
        
        // 3. Generate nonce (in practice, this would call the contract)
        const nonce = this.generateNonce(senderAddr, secret);
        
        // 4. Create commitment
        const commitment = this.createCommitment(secret, amount, nonce, expiry, senderAddr);
        
        // 5. Create transfer data
        const transferData: LinkTransferData = {
            secret,
            amount,
            nonce,
            expiry,
            senderAddr,
            tokenId
        };
        
        // 6. Create shareable link
        const encodedData = this.encodeLinkData(transferData);
        const link = `https://supercash.app/claim/${encodedData}`;
        
        return { commitment, link, transferData };
    }

    /**
     * Create link transfer for APT
     */
    async transferWithLinkAPT(
        sender: AptosAccount,
        amount: number,
        expiryHours: number
    ): Promise<{ transactionHash: string, link: string, objectAddress?: string }> {
        const { commitment, link } = this.generateLinkTransfer(
            amount, 
            expiryHours, 
            sender.address().hex(),
            TokenId.APT
        );

        const expiry = Math.floor(Date.now() / 1000) + (expiryHours * 3600);

        const payload = {
            type: "entry_function_payload",
            function: `${CONTRACT_ADDRESS}::payments::transfer_with_link_apt`,
            type_arguments: [],
            arguments: [
                Array.from(commitment),
                amount.toString(),
                expiry.toString()
            ]
        };
        
        const txnRequest = await this.client.generateTransaction(sender.address(), payload);
        const signedTxn = await this.client.signTransaction(sender, txnRequest);
        const transactionRes = await this.client.submitTransaction(signedTxn);
        await this.client.waitForTransaction(transactionRes.hash);
        
        // Extract object address from events
        const transaction = await this.client.getTransactionByHash(transactionRes.hash);
        const objectAddress = this.extractObjectAddressFromEvents(transaction);

        return {
            transactionHash: transactionRes.hash,
            link,
            objectAddress
        };
    }

    /**
     * Create link transfer for FA tokens
     */
    async transferWithLinkFA(
        sender: AptosAccount,
        tokenId: TokenId,
        amount: number,
        expiryHours: number
    ): Promise<{ transactionHash: string, link: string, objectAddress?: string }> {
        if (tokenId === TokenId.APT) {
            throw new Error("Use transferWithLinkAPT for APT transfers");
        }

        const { commitment, link } = this.generateLinkTransfer(
            amount, 
            expiryHours, 
            sender.address().hex(),
            tokenId
        );

        const expiry = Math.floor(Date.now() / 1000) + (expiryHours * 3600);

        const payload = {
            type: "entry_function_payload",
            function: `${CONTRACT_ADDRESS}::payments::transfer_with_link_fa`,
            type_arguments: [],
            arguments: [
                tokenId.toString(),
                Array.from(commitment),
                amount.toString(),
                expiry.toString()
            ]
        };
        
        const txnRequest = await this.client.generateTransaction(sender.address(), payload);
        const signedTxn = await this.client.signTransaction(sender, txnRequest);
        const transactionRes = await this.client.submitTransaction(signedTxn);
        await this.client.waitForTransaction(transactionRes.hash);
        
        // Extract object address from events
        const transaction = await this.client.getTransactionByHash(transactionRes.hash);
        const objectAddress = this.extractObjectAddressFromEvents(transaction);

        return {
            transactionHash: transactionRes.hash,
            link,
            objectAddress
        };
    }

    /**
     * Claim a link transfer
     */
    async claimTransferLink(
        claimer: AptosAccount,
        linkData: string,
        objectAddress: string
    ): Promise<string> {
        const transferData = this.decodeLinkData(linkData);

        const payload = {
            type: "entry_function_payload",
            function: `${CONTRACT_ADDRESS}::payments::claim_transfer_link`,
            type_arguments: [],
            arguments: [
                Array.from(transferData.secret),
                transferData.amount.toString(),
                transferData.nonce.toString(),
                transferData.expiry.toString(),
                transferData.senderAddr,
                objectAddress
            ]
        };
        
        const txnRequest = await this.client.generateTransaction(claimer.address(), payload);
        const signedTxn = await this.client.signTransaction(claimer, txnRequest);
        const transactionRes = await this.client.submitTransaction(signedTxn);
        await this.client.waitForTransaction(transactionRes.hash);
        
        return transactionRes.hash;
    }

    // === VIEW FUNCTIONS ===

    /**
     * Get system statistics
     */
    async getSystemStats(): Promise<{
        directTransfers: number,
        linkTransfers: number,
        claims: number,
        tokenVolumes: number[]
    }> {
        const payload = {
            function: `${CONTRACT_ADDRESS}::payments::get_system_stats`,
            type_arguments: [],
            arguments: []
        };

        const result = await this.client.view(payload);
        return {
            directTransfers: parseInt(result[0] as string),
            linkTransfers: parseInt(result[1] as string),
            claims: parseInt(result[2] as string),
            tokenVolumes: (result[3] as string[]).map(v => parseInt(v))
        };
    }

    /**
     * Get supported tokens
     */
    async getSupportedTokens(): Promise<TokenId[]> {
        const payload = {
            function: `${CONTRACT_ADDRESS}::payments::get_supported_tokens`,
            type_arguments: [],
            arguments: []
        };

        const result = await this.client.view(payload);
        return (result[0] as string[]).map(id => parseInt(id) as TokenId);
    }

    /**
     * Get token information
     */
    async getTokenInfo(tokenId: TokenId): Promise<{
        name: string,
        symbol: string,
        decimals: number,
        isCoin: boolean,
        isActive: boolean
    }> {
        const payload = {
            function: `${CONTRACT_ADDRESS}::payments::get_token_info`,
            type_arguments: [],
            arguments: [tokenId.toString()]
        };

        const result = await this.client.view(payload);
        return {
            name: result[0] as string,
            symbol: result[1] as string,
            decimals: parseInt(result[2] as string),
            isCoin: result[3] as boolean,
            isActive: result[4] as boolean
        };
    }

    /**
     * Get link transfer information
     */
    async getLinkTransferInfo(objectAddress: string): Promise<{
        sender: string,
        tokenId: TokenId,
        amount: number,
        expiry: number,
        claimed: boolean
    }> {
        const payload = {
            function: `${CONTRACT_ADDRESS}::payments::get_link_transfer_info`,
            type_arguments: [],
            arguments: [objectAddress]
        };

        const result = await this.client.view(payload);
        return {
            sender: result[0] as string,
            tokenId: parseInt(result[1] as string) as TokenId,
            amount: parseInt(result[2] as string),
            expiry: parseInt(result[3] as string),
            claimed: result[4] as boolean
        };
    }

    // === HELPER FUNCTIONS ===

    /**
     * Create cryptographic commitment
     */
    private createCommitment(
        secret: Uint8Array,
        amount: number,
        nonce: number,
        expiry: number,
        senderAddr: string
    ): Uint8Array {
        // Concatenate all data
        const data = new Uint8Array(
            32 +        // secret (32 bytes)
            8 +         // amount (8 bytes)
            8 +         // nonce (8 bytes)
            8 +         // expiry (8 bytes)
            32          // sender address (32 bytes)
        );

        let offset = 0;
        
        // Add secret
        data.set(secret, offset);
        offset += 32;
        
        // Add amount (little-endian)
        const amountBytes = new ArrayBuffer(8);
        new DataView(amountBytes).setBigUint64(0, BigInt(amount), true);
        data.set(new Uint8Array(amountBytes), offset);
        offset += 8;
        
        // Add nonce (little-endian)
        const nonceBytes = new ArrayBuffer(8);
        new DataView(nonceBytes).setBigUint64(0, BigInt(nonce), true);
        data.set(new Uint8Array(nonceBytes), offset);
        offset += 8;
        
        // Add expiry (little-endian)
        const expiryBytes = new ArrayBuffer(8);
        new DataView(expiryBytes).setBigUint64(0, BigInt(expiry), true);
        data.set(new Uint8Array(expiryBytes), offset);
        offset += 8;
        
        // Add sender address
        const addrBytes = HexString.ensure(senderAddr).toUint8Array();
        data.set(addrBytes, offset);
        
        // Hash with SHA3-256
        const hash = SHA3(data, { outputLength: 256 });
        return new Uint8Array(hash.words.map(w => [
            (w >>> 24) & 0xff,
            (w >>> 16) & 0xff,
            (w >>> 8) & 0xff,
            w & 0xff
        ]).flat());
    }

    /**
     * Generate nonce (simplified - in practice would call contract)
     */
    private generateNonce(senderAddr: string, secret: Uint8Array): number {
        const timestamp = Math.floor(Date.now() / 1000);
        const combined = new Uint8Array(8 + 32 + secret.length);
        
        // Add timestamp
        new DataView(combined.buffer).setBigUint64(0, BigInt(timestamp), true);
        
        // Add sender address
        const addrBytes = HexString.ensure(senderAddr).toUint8Array();
        combined.set(addrBytes, 8);
        
        // Add secret
        combined.set(secret, 8 + 32);
        
        // Hash and convert to number
        const hash = SHA3(combined, { outputLength: 256 });
        return hash.words[0] >>> 0; // Convert to unsigned 32-bit
    }

    /**
     * Encode link data for URL
     */
    private encodeLinkData(data: LinkTransferData): string {
        const json = {
            s: Array.from(data.secret),
            a: data.amount,
            n: data.nonce,
            e: data.expiry,
            sa: data.senderAddr,
            t: data.tokenId
        };
        
        const jsonStr = JSON.stringify(json);
        return Buffer.from(jsonStr).toString('base64url');
    }

    /**
     * Decode link data from URL
     */
    private decodeLinkData(encodedData: string): LinkTransferData {
        const jsonStr = Buffer.from(encodedData, 'base64url').toString();
        const json = JSON.parse(jsonStr);
        
        return {
            secret: new Uint8Array(json.s),
            amount: json.a,
            nonce: json.n,
            expiry: json.e,
            senderAddr: json.sa,
            tokenId: json.t
        };
    }

    /**
     * Extract object address from transaction events
     */
    private extractObjectAddressFromEvents(transaction: any): string | undefined {
        const events = transaction.events || [];
        
        for (const event of events) {
            if (event.type.includes('LinkCreatedEvent')) {
                return event.data.object_address;
            }
        }
        
        return undefined;
    }

    // === EVENT PARSING ===

    /**
     * Parse direct transfer events
     */
    parseDirectTransferEvents(transaction: any): DirectTransferEvent[] {
        const events = transaction.events || [];
        return events
            .filter((event: any) => event.type.includes('DirectTransferEvent'))
            .map((event: any) => event.data as DirectTransferEvent);
    }

    /**
     * Parse link created events
     */
    parseLinkCreatedEvents(transaction: any): LinkCreatedEvent[] {
        const events = transaction.events || [];
        return events
            .filter((event: any) => event.type.includes('LinkCreatedEvent'))
            .map((event: any) => event.data as LinkCreatedEvent);
    }

    /**
     * Parse link claimed events
     */
    parseLinkClaimedEvents(transaction: any): LinkClaimedEvent[] {
        const events = transaction.events || [];
        return events
            .filter((event: any) => event.type.includes('LinkClaimedEvent'))
            .map((event: any) => event.data as LinkClaimedEvent);
    }
}

// Export utility functions
export { SuperCashClient as default };

// Example usage:
/*
const client = new SuperCashClient("https://fullnode.devnet.aptoslabs.com/v1");

// Direct transfer
const hash = await client.directTransferAPT(senderAccount, recipientAddress, 100000000); // 1 APT

// Link transfer
const { transactionHash, link } = await client.transferWithLinkAPT(senderAccount, 50000000, 24); // 0.5 APT, 24h expiry
console.log(`Share this link: ${link}`);

// Claim transfer
await client.claimTransferLink(claimerAccount, linkData, objectAddress);
*/