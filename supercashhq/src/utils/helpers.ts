const generateSecretAndHash = async () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const hashBuffer = await crypto.subtle.digest("SHA-256", secret);
    const hashArray = new Uint8Array(hashBuffer);
    return { secret, hash: hashArray };
}

const convertToSmallestUnit = (amount: number, decimals: number): number => {
    return Math.floor(amount * Math.pow(10, decimals));
}

export { generateSecretAndHash, convertToSmallestUnit };