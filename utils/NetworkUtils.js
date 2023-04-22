
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
        case 'arbitrum-goerli':
            return 421613;

        case 'optimism':
            return 10;
        case 'optimism-goerli':
            return 420;

        case 'fantom':
            return 250;
        case 'fantom-test':
            return 4002;

        case 'avalanche':
            return 43114;
        case 'avalanche-test':
            return 43113;

        case 'gnosis':
            return 100;

        case 'bsc':
            return 56;
        case 'bsc-test':
            return 97;
    }
    return undefined;
}


export const getNetwork = (chainId) => {
    switch (chainId) {
        case 1:
            return 'mainnet';
        case 5:
            return 'goerli';

        case 137:
            return 'matic';
        case 80001:
            return 'mumbai';

        case 42161:
            return 'arbitrum-one';
        case 421613:
            return 'arbitrum-goerli';

        case 10:
            return 'optimism';
        case 420:
            return 'optimism-goerli';

        case 250:
            return 'fantom';
        case 4002:
            return 'fantom-test';

        case 43114:
            return 'avalanche';
        case 43113:
            return 'avalanche-test';

        case 100:
            return 'gnosis';

        case 56:
            return 'bsc';
        case 97:
            return 'bsc-test';
    }
    return undefined;
}
