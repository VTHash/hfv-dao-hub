// HFV-green curated DAO list with official links.
// Links verified from official portals/forums/vote UIs where available.

export const TAGS = [
  "All",
  "L2",
  "DEX",
  "Lending",
  "Liquid Staking",
  "Perps",
  "Identity",
  "Wallet",
  "Indexing",
  "Grants",
  "DAO Tooling",
  "DeFi",
  "Treasury Top"
];

export const DAOS = [
    {
  id: "hfv",
  name: "HFV Protocol",
  short: "HFV",
  logo: "/logos/hfv-logo.png",
  tags: ["HFV", "Ecosystem"],
  app: "https://hfvstaking.app/",
  governance: "https://hfvprotocol.org/dao", // replace later if add Snapshot/Tally
  forum: "https://discord.gg/Be4mQEFN", // or HFV community hub
  description: "Native HFV Protocol hub — your ecosystem gateway."
},
  {
    id: "mantle",
    name: "Mantle DAO",
    logo: "/logos/mantle-mnt-logo.svg",
    tags: ["L2", "Treasury Top", "DeFi"],
    app: "https://www.mantle.xyz/",
    governance: "https://delegatevote.mantle.xyz/",
    forum: "https://www.mantle.xyz/blog",
    description: "Ethereum L2 with DAO-governed treasury & products."
  },
  {
    id: "uniswap",
    name: "Uniswap DAO",
    logo: "/logos/uniswap.png",
    tags: ["DEX", "DeFi"],
    app: "https://uniswap.org/",
    governance: "https://uniswapfoundation.org/governance",
    forum: "https://gov.uniswap.org/",
    vote: "https://www.tally.xyz/gov/uniswap",
    description: "Leading AMM; active forum + on-chain vote portal."
  },
  {
    id: "optimism",
    name: "Optimism Collective",
    logo: "/logos/optimism.png",
    tags: ["L2", "Grants"],
    app: "https://community.optimism.io/welcome/welcome-overview",
    governance: "https://vote.optimism.io/",
    forum: "https://gov.optimism.io/",
    description: "OP governance (Token House & Citizens’ House)." 
  },
  {
    id: "ens",
    name: "ENS DAO",
    logo: "/logos/ens.png", 
    tags: ["Identity"],
    app: "https://ens.domains/",
    governance: "https://ens.domains/governance",
    forum: "https://discuss.ens.domains/",
    snapshot: "https://snapshot.box/#/s:ens.eth",
    description: "Ethereum naming; robust governance & Snapshot voting." 
  },
  {
    id: "arbitrum",
    name: "Arbitrum DAO",
    logo: "/logos/arbitrum.png", 
    tags: ["L2", "Grants"],
    app: "https://portal.arbitrum.io/",
    governance: "https://docs.arbitrum.foundation/how-tos/vote-dao-proposals",
    forum: "https://forum.arbitrum.foundation/",
    vote: "https://www.tally.xyz/gov/arbitrum",
    description: "Major L2 with onchain & community governance." 
  },
  {
    id: "dexe",
    name: "DeXe DAO",
    logo: "/logos/dexe.png", 
    tags: ["DAO Tooling"],
    app: "https://dexe.network/",
    governance: "https://www.dexe.io/",
    forum: "https://www.dexe.io/",
    description: "Tooling suite for creating & managing DAOs." 
  },
  {
    id: "gnosis",
    name: "GnosisDAO",
    logo: "/logos/gnosis.png",
    tags: ["Wallet", "DAO Tooling"],
    app: "https://www.gnosis.io/",
    governance: "https://docs.gnosis.io/docs/Goverance",
    forum: "https://forum.gnosis.io/",
    description: "Open governance overseeing Gnosis ecosystem." 
  },
  {
    id: "maker",
    name: "MakerDAO (Sky)",
    logo: "/logos/makerdao.png", 
    tags: ["DeFi", "Treasury Top"],
    app: "https://sky.money/",
    governance: "https://vote.makerdao.com/",
    forum: "https://forum.makerdao.com/",
    description: "Long-running DeFi DAO with active governance." 
  },
  {
    id: "graph",
    name: "The Graph DAO",
    logo: "/logos/thegraph.png",
    tags: ["Indexing", "Infra"],
    app: "https://thegraph.com/",
    governance: "https://thegraph.com/governance/",
    forum: "https://forum.thegraph.com/",
    snapshot: "https://snapshot.box/#/thegraph.eth",
    description: "Web3 indexing DAO with community governance"
  },
  {
    id: "safe",
    name: "SafeDAO",
    logo: "/logos/safe.png",
    tags: ["Wallet", "DAO Tooling"],
    app: "https://safe.global/",
    governance: "https://safe.global/governance",
    forum: "https://forum.safe.global/",
    description: "Smart wallet ecosystem DAO."
  },
  {
    id: "lido",
    name: "Lido DAO",
    logo: "/logos/lido.png",
    tags: ["Liquid Staking", "DeFi"],
    app: "https://lido.fi/",
    governance: "https://lido.fi/governance",
    forum: "https://research.lido.fi/",
    snapshot: "https://vote.lido.fi/",
    description: "Largest liquid staking DAO."
  },
  {
    id: "aave",
    name: "Aave DAO",
    logo: "/logos/aave.png",
    tags: ["Lending", "DeFi"],
    app: "https://app.aave.com/",
    governance: "https://app.aave.com/governance/",
    forum: "https://governance.aave.com/",
    vote: "https://vote.onaave.com/",
    description: "Lending DAO with governance forum."
  },
  {
    id: "compound",
    name: "Compound DAO",
    logo: "/logos/compound.png",
    tags: ["Lending", "DeFi"],
    app: "https://compound.finance/",
    governance: "https://compound.finance/governance/comp",
    forum: "https://www.comp.xyz/",
    vote: "https://www.tally.xyz/gov/compound",
    description: "Algorithmic money markets DAO."
  },
  {
    id: "gitcoin",
    name: "Gitcoin DAO",
    logo: "/logos/gitcoin.jpg",
    tags: ["Grants", "Public Goods"],
    app: "https://gitcoin.co/",
    governance: "https://gitcoin.co/gtc/empowering-governance",
    forum: "https://gov.gitcoin.co/",
    description: "Public goods grants DAO."
  },
  {
    id: "dydx",
    name: "dYdX DAO",
    logo: "/logos/dydx.png",
    tags: ["Perps", "DeFi"],
    app: "https://dydx.community/",
    governance: "https://www.dydx.foundation/",
    forum: "https://dydx.forum/",
    description: "Perps protocol DAO with active forum."
  }
];

