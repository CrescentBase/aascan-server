
export const getChainId = (network) => {
    switch (network) {
        case 'mainnet':
            return 1;
        case 'goerli':
            return 5;
        case 'matic':
            return 137;
        case 'mumbai':
            return 80001;
        case 'arbitrum-one':
            return 42161;
        case 'optimism':
            return 10;
        case 'optimism-goerli':
            return 420;
    }
    return undefined;
}
