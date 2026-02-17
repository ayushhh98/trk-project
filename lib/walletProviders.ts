import type { EIP1193Provider } from "viem";

export type InjectedProvider = EIP1193Provider & {
    isMetaMask?: true;
    isTrust?: true;
    isTrustWallet?: true;
    providers?: InjectedProvider[];
};

const getEthereum = (windowObj?: any) => (windowObj as any)?.ethereum as InjectedProvider | undefined;

export const getInjectedProviders = (windowObj?: any) => {
    const eth = getEthereum(windowObj);
    if (!eth) return [] as InjectedProvider[];
    const providers = Array.isArray((eth as any).providers) ? ((eth as any).providers as InjectedProvider[]) : [];
    if (!providers.length) return [eth];
    const all = providers.slice();
    if (!all.includes(eth)) all.push(eth);
    return all;
};

const getTrustMarker = (windowObj?: any) => (windowObj as any)?.trustwallet;

export const getTrustProvider = (windowObj?: any) => {
    const providers = getInjectedProviders(windowObj);
    if (!providers.length) return undefined;
    const trustMarker = getTrustMarker(windowObj);
    const trustProviderFromMarker = trustMarker?.ethereum ?? trustMarker;
    return providers.find((provider) =>
        provider?.isTrust ||
        provider?.isTrustWallet ||
        (!!trustProviderFromMarker && provider === trustProviderFromMarker)
    );
};

export const getMetaMaskProvider = (windowObj?: any) => {
    const providers = getInjectedProviders(windowObj);
    if (!providers.length) return undefined;
    const trustProvider = getTrustProvider(windowObj);
    const trustMarker = getTrustMarker(windowObj);

    const metaMaskCandidate = providers.find((provider) =>
        provider?.isMetaMask &&
        !provider?.isTrust &&
        !provider?.isTrustWallet &&
        provider !== trustProvider
    );

    if (!metaMaskCandidate) return undefined;

    return metaMaskCandidate;
};

export const detectInjectedWallets = (windowObj?: any) => {
    const metaMaskProvider = getMetaMaskProvider(windowObj);
    const trustProvider = getTrustProvider(windowObj);
    const eth = getEthereum(windowObj);
    const fallbackMetaMask = !!eth
        && !!eth.isMetaMask
        && !eth.isTrust
        && !eth.isTrustWallet
        && eth !== trustProvider;
    return {
        hasMetaMask: !!metaMaskProvider || fallbackMetaMask,
        hasTrust: !!trustProvider,
        metaMaskProvider,
        trustProvider
    };
};
