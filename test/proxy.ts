/* eslint-disable no-unused-vars */
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
// @ts-ignore
import { ExchangeOperator } from "../typechain/ExchangeOperator";
// @ts-ignore
import { BytesLike, Bytes } from "@ethersproject/bytes";
// @ts-ignore
import { ERC721, ERC721Instance } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
type BigNumberish = BigNumber | Bytes | bigint | string | number;
export interface Order {
  exchange: string;
  maker: string;
  taker: string;
  feeRecipient: string;
  target: string;
  staticTarget: string;
  paymentToken: string;
  makerRelayerFee: string;
  takerRelayerFee: string;
  makerProtocolFee: string;
  takerProtocolFee: string;
  basePrice: string;
  extra: string;
  listingTime: string;
  expirationTime: string;
  salt: string;
  feeMethod: string;
  side: string;
  saleKind: string;
  howToCall: string;
  data: string | any[];
  replacementPattern: string | any[];
  staticExtradata: string | any[];

  hash: string;
  signature: string;
  tokenId: string;
}

export interface NFTInfo {
  artistAddr: string;
  attrFeatures: any;
  attrFeaturesJson: any;
  attrLevels: "";
  attrLevelsJson: any;
  auditStatus: number;
  collectionId: number;
  collectionIndex: number;
  contractAddr: string;
  coverUrlKey: string;
  createTime: string;
  description: string;
  detail: string;
  externalUrl: string;
  fileUrlKey: string;
  historyList?: Array<any>;
  hot: number;
  id: number;
  like: number;
  name: string;
  order: Order;
  ownerAddr: string;
  shareUrl: string;
  supply: string;
  tokenId: string;
  view: string;
  workIndex: number;
  workItemIndex: number;
  [propName: string]: any;
}

const relayerOpt = {
  fee: {
    takerRelayerFee: "0",
    makerProtocolFee: "0",
    takerProtocolFee: "0",
    makerRelayerFee: "250",
  },
  // 中介费用收款地址
  feeRecipient: "0x6326F7942948ff64Df4D7798c0c4df787DB9b448",
  feeMethod: "1",
};
interface MatchOrder {
  addrs: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string
  ];
  uints: [
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish
  ];
  feeMethodsSidesKindsHowToCalls: [
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish
  ];
  calldataBuy: BytesLike;
  calldataSell: BytesLike;
  replacementPatternBuy: BytesLike;
  replacementPatternSell: BytesLike;
  staticExtradataBuy: BytesLike;
  staticExtradataSell: BytesLike;
  vs: [BigNumberish, BigNumberish];
  rss: [BytesLike, BytesLike, BytesLike, BytesLike];
}
const coinAddress = "0x0000000000000000000000000000000000000000";
const exchangeAddress = "0x958fae4107488753887021D74101F8573f8C5767";
const exchangeOperator = "0x57b08E601E4EE21B7134e071388006082aC7aa82";
interface ParamTypeRes {
  addrs: [string, string, string, string, string, string, string];
  uints: [
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish,
    BigNumberish
  ];
  feeMethod: BigNumberish;
  side: BigNumberish;
  saleKind: BigNumberish;
  howToCall: BigNumberish;
  data: BytesLike;
  replacementPattern: BytesLike;
  staticExtradata: BytesLike;
}

const getRSVFromSignature = (signature: string): [string, string, number] => {
  console.log(signature, "signature");
  signature = signature.slice(0, 2) === "0x" ? signature.slice(2) : signature;
  const r = `0x${signature.slice(0, 64)}`;
  const s = `0x${signature.slice(64, 128)}`;
  const v = parseInt(`0x${signature.slice(128)}`, 16);
  return [r, s, v];
};
const VUE_APP_CREATURE_CONTRACT_ADDRESS =
  "0xb1fAFF947FadBf4E435647C4E902c9a9F2DE4CE7";
const extractParams = function (order: Order): ParamTypeRes {
  const {
    exchange,
    maker,
    taker,
    feeRecipient,
    target,
    staticTarget,
    paymentToken,
    makerRelayerFee,
    takerRelayerFee,
    makerProtocolFee,
    takerProtocolFee,
    basePrice,
    extra,
    listingTime,
    expirationTime,
    salt,
    feeMethod,
    side,
    saleKind,
    howToCall,
    data,
    replacementPattern,
    staticExtradata,
  } = order;

  const params: ParamTypeRes = {
    addrs: [
      exchange,
      maker,
      taker,
      feeRecipient,
      target,
      staticTarget,
      paymentToken,
    ],
    uints: [
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      basePrice,
      extra,
      listingTime,
      expirationTime,
      salt,
    ],
    feeMethod,
    side,
    saleKind,
    howToCall,
    data,
    replacementPattern,
    staticExtradata,
  };
  return params;
};

const sign = async function (
  wallet: SignerWithAddress,
  hash: string
): Promise<string> {
  console.log("wallet", wallet.address);
  return await wallet.signMessage(ethers.utils.arrayify(hash));
};
const getExchangeOperatorContractHash = async (
  exchangeOperatorContract: ExchangeOperator,
  order: Order
): Promise<string> => {
  const params = extractParams(order);

  // eslint-disable-next-line no-underscore-dangle
  const res = await exchangeOperatorContract.hashOrder_(
    params.addrs,
    params.uints,
    params.feeMethod,
    params.side,
    params.saleKind,
    params.howToCall,
    params.data,
    params.replacementPattern,
    params.staticExtradata
  );
  console.log(res, "res");
  return res;
};
const canMatch = async (buy: Order, sell: Order): Promise<Boolean> => {
  /* Must be opposite-side. */
  return (
    buy.side === "0" &&
    sell.side === "1" &&
    /* Must use same fee method. */
    buy.feeMethod === sell.feeMethod &&
    /* Must use same payment token. */
    buy.paymentToken === sell.paymentToken &&
    /* Must match maker/taker addresses. */
    (sell.taker === coinAddress || sell.taker === buy.maker) &&
    (buy.taker === coinAddress || buy.taker === sell.maker) &&
    // /* One must be maker and the other must be taker (no bool XOR in Solidity). */
    ((sell.feeRecipient === coinAddress && buy.feeRecipient !== coinAddress) ||
      (sell.feeRecipient !== coinAddress &&
        buy.feeRecipient === coinAddress)) &&
    // /* Must match target. */
    buy.target === sell.target &&
    // /* Must match howToCall. */
    buy.howToCall === sell.howToCall
  );
};

const createTxData = async (
  erc721instance: ERC721Instance,
  maker: string,
  target: string,
  tokenId: BigNumberish
) => {
  return erc721instance.interface.encodeFunctionData("transferFrom", [
    maker,
    target,
    tokenId,
  ]);
};

const createBuyOrder = async function (
  wallet: SignerWithAddress,
  exchangeCore: string,
  erc721: ERC721Instance,
  exchangeOperatorContract: ExchangeOperator,
  { maker, target, tokenId }: Record<string, string>,
  saleOrder: Order
) {
  const txData = await createTxData(erc721, maker, target, tokenId);
  console.log(txData, "txData");
  const buyOrder: Order = {
    exchange: exchangeCore,
    maker,
    taker: saleOrder.maker,
    feeRecipient: "0x0000000000000000000000000000000000000000",
    target,
    staticTarget: "0x0000000000000000000000000000000000000000",
    paymentToken: "0x0000000000000000000000000000000000000000",
    ...relayerOpt.fee,
    basePrice: saleOrder.basePrice,
    extra: "0",
    listingTime: saleOrder.listingTime,
    expirationTime: saleOrder.expirationTime,
    salt: "0x00",
    feeMethod: relayerOpt.feeMethod,
    side: "0",
    saleKind: "0",
    howToCall: "0",
    // tx.data
    data: txData,
    replacementPattern: "0x",
    // 待定
    staticExtradata: "0x",
    // 调用合约生成的hash
    hash: "",
    // 用户对 从合约得到hash进行签名
    signature: "",

    tokenId,
  };
  const hash = await getExchangeOperatorContractHash(
    exchangeOperatorContract,
    buyOrder
  );
  console.log(hash);
  const signature = await sign(wallet, hash);

  console.log(signature, "signature");
  buyOrder.signature = signature;
  buyOrder.hash = hash;
  return buyOrder;
  //   sendTransaction(buyOrder, saleOrder);
};
const validateOrder = async (order: Order): Promise<Boolean> => {
  /* Order must be targeted at this protocol version (this Exchange contract). */
  if (order.exchange !== exchangeAddress) {
    return false;
  }

  /* Order must possess valid sale kind parameter combination. */
  if (!(order.saleKind === "0" || parseInt(order.expirationTime) > 0)) {
    return false;
  }

  /* If using the split fee method, order must have sufficient protocol fees. */
  if (
    order.feeMethod === "1" &&
    (parseInt(order.makerProtocolFee) < 0 ||
      parseInt(order.takerProtocolFee) < 0)
  ) {
    return false;
  }

  return true;
};
const createSaleOrder = async (
  wallet: SignerWithAddress,
  exchangeCore: string,
  exchangeOperatorContract: ExchangeOperator,
  {
    maker,
    price,
    tokenId,
    listingTime = "0",
    expirationTime = "0",
  }: Record<string, string>
) => {
  const saleOrder: Order = {
    exchange: exchangeCore,
    maker,
    taker: "0x0000000000000000000000000000000000000000",
    feeRecipient: relayerOpt.feeRecipient,
    target: VUE_APP_CREATURE_CONTRACT_ADDRESS,
    staticTarget: "0x0000000000000000000000000000000000000000",
    paymentToken: "0x0000000000000000000000000000000000000000",
    ...relayerOpt.fee,
    basePrice: "1000",
    // basePrice: '10000',
    extra: "0", // 拍卖参数
    listingTime,
    expirationTime,
    // salt: web3Ins?.utils.hexToNumberString(web3Ins?.utils.randomHex(32) || '0x00') || '', // 自己生成随机hash
    salt: "0", // 自己生成随机hash
    feeMethod: relayerOpt.feeMethod,
    side: "1",
    saleKind: "0",
    howToCall: "0",
    // tx.data
    data: "0x",
    replacementPattern: "0x",
    // 待定
    staticExtradata: "0x",
    // 调用合约生成的hash
    hash: "",
    // 用户对 从合约得到hash进行签名
    signature: "",

    tokenId,
  };
  const hash = await getExchangeOperatorContractHash(
    exchangeOperatorContract,
    saleOrder
  );
  const signature = await sign(wallet, hash);
  console.log(signature, "signature");
  saleOrder.signature = signature;
  saleOrder.hash = hash;
  // const isValid = await validateSaleOrder(saleOrder)
  // console.log(isValid, 'isValid')
  return saleOrder;
};

const sendTransaction = async (
  wallet: SignerWithAddress,
  buyOrder: Order,
  saleOrder: Order,
  exchangeOperatorContract: ExchangeOperator
) => {
  console.log(buyOrder, "buyOrder");
  console.log(saleOrder, "saleOrder");
  const buyOrderParams = extractParams(buyOrder);
  const saleOrderParams = extractParams(saleOrder);
  const [r1, s1, v1] = getRSVFromSignature(buyOrder.signature);
  const [r2, s2, v2] = getRSVFromSignature(saleOrder.signature);
  const params: MatchOrder = {
    addrs: [...buyOrderParams.addrs, ...saleOrderParams.addrs],
    uints: [...buyOrderParams.uints, ...saleOrderParams.uints],
    feeMethodsSidesKindsHowToCalls: [
      buyOrderParams.feeMethod,
      buyOrderParams.side,
      buyOrderParams.saleKind,
      buyOrderParams.howToCall,
      saleOrderParams.feeMethod,
      saleOrderParams.side,
      saleOrderParams.saleKind,
      saleOrderParams.howToCall,
    ],
    calldataBuy: buyOrderParams.data,
    calldataSell: saleOrderParams.data,
    replacementPatternBuy: buyOrderParams.replacementPattern,
    replacementPatternSell: saleOrderParams.replacementPattern,
    staticExtradataBuy: buyOrderParams.staticExtradata,
    staticExtradataSell: saleOrderParams.staticExtradata,
    vs: [v1, v2],
    rss: [r1, s1, r2, s2],
  };
  console.log(await canMatch(buyOrder, saleOrder));
  const res = await exchangeOperatorContract
    .connect(wallet)
    .ordersCanMatch_(
      params.addrs,
      params.uints,
      params.feeMethodsSidesKindsHowToCalls,
      params.calldataBuy,
      params.calldataSell,
      params.replacementPatternBuy,
      params.replacementPatternSell,
      params.staticExtradataBuy,
      params.staticExtradataSell
    );
  console.log(res, "ordersCanMatch_");

  console.log(params, "sendTransaction");
  const weiAmount = ethers.utils.parseEther("1.1");
  const transaction = {
    from: wallet.address,
    value: weiAmount,
  };
  // eslint-disable-next-line no-underscore-dangle
  return exchangeOperatorContract
    .connect(wallet)
    .atomicMatch_(
      params.addrs,
      params.uints,
      params.feeMethodsSidesKindsHowToCalls,
      params.calldataBuy,
      params.calldataSell,
      params.replacementPatternBuy,
      params.replacementPatternSell,
      params.staticExtradataBuy,
      params.staticExtradataSell,
      params.vs,
      params.rss,
      transaction
    );
};
const waitForTx = async (
  provider: { getTransactionReceipt: (arg0: any) => any },
  hash: any
) => {
  console.log(`Waiting for tx: ${hash}`);
  const invId = setInterval(async function () {
    if (await provider.getTransactionReceipt(hash)) {
      clearInterval(invId);
    }
  });
};

describe("proxy", function () {
  let contractOwne: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    this.timeout(10000000);
    [contractOwne, user1, user2] = await ethers.getSigners();
    const block = await ethers.provider.getBlockNumber();
    this.accounts = await ethers.provider.listAccounts();
    console.log(block);
    const LandProxyRegistry = await ethers.getContractFactory(
      "LandProxyRegistry"
    );
    this.register = await LandProxyRegistry.attach(
      "0x0C9070A48Be44D98c42e18DF4573030D9174EB66"
    );

    // await this.register.attach("0xACC4190b0540E890Ff735044208C995202a79976");

    console.log("register deployed to:", this.register.address);
    this.ownableDelegateProxyFactory = await ethers.getContractFactory(
      "OwnableDelegateProxy"
    );

    this.authenticatedProxy = await ethers.getContractFactory(
      "AuthenticatedProxy"
    );
    // this.voice = await Voice721.attach(
    //   "0xe6555e13D891927619f0DBD59eb131ea22110180"
    // );

    const TokenTransferProxy = await ethers.getContractFactory(
      "TokenTransferProxy"
    );
    // this.voice = await Voice721.attach(
    //   "0xe6555e13D891927619f0DBD59eb131ea22110180"
    // );
    this.tokenProxy = await TokenTransferProxy.attach(
      "0x2baa9863D48EAF6ac9Af87E7cD800Be87B51FE19"
    );
    // await this.tokenProxy.attach("0xa2b7247455881937F88be208C5eC3e9333DcC32a");

    console.log("TokenTransferProxy deployed to:", this.tokenProxy.address);

    const ExchangeCore = await ethers.getContractFactory("ExchangeCore");
    // this.exchange = await ExchangeCore.deploy(
    //   this.register.address,
    //   this.tokenProxy.address,
    //   coinAddress,
    //   feeAddress
    // );
    this.exchange = await ExchangeCore.attach(exchangeAddress);
    // await this.exchange.attach("0x2B8360a494BfaDBBF8CE766E679b11551c6D3d32");
    console.log("ExchangeCore deployed to:", this.exchange.address);

    const ExchangeOperator = await ethers.getContractFactory(
      "ExchangeOperator"
    );
    this.exchangeOperator = await ExchangeOperator.attach(exchangeOperator);
    console.log(
      "ExchangeOperatorInstance deployed to:",
      this.exchangeOperator.address
    );
    const ERC721Instance = await ethers.getContractFactory("ERC721Instance");
    // this.eRC721Instance = await ERC721Instance.deploy("FCM", "FCM", "test");
    this.eRC721Instance = await ERC721Instance.attach(
      "0xb1fAFF947FadBf4E435647C4E902c9a9F2DE4CE7"
    );
    console.log("eRC721Instance deployed to:", this.eRC721Instance.address);
  });
  it("proxy register success", async function () {
    this.timeout(100000000);
    console.log(contractOwne.address, user1.address, user2.address);
    await this.register["grantAuthentication(address)"](this.exchange.address);

    // await expect(this.register.connect(user1).registerProxy()).to.emit(
    //   this.register,
    //   "ProxyReg"
    // );
    // const newProxy1 = await this.register.connect(user1).proxies(user1.address);
    // console.log(newProxy1);
    // const proxy2 = await this.register.connect(user2).proxies(user2.address);
    // expect(proxy2).to.equal(coinAddress);

    // await expect(this.register.connect(user2).registerProxy()).to.emit(
    //   this.register,
    //   "ProxyReg"
    // );

    const proxy = await this.register.connect(user1).proxies(user1.address);
    console.log("proxy ", proxy);
    const ownerDelegatorInstance1 =
      await this.ownableDelegateProxyFactory.attach(proxy);
    const authenticatedProxyInstance1 = await this.authenticatedProxy.attach(
      proxy
    );
    const impl1 = await ownerDelegatorInstance1.implementation();

    expect(impl1).to.equal(await this.register.delegateProxyImplementation());
    // await authenticatedProxyInstance1.setRevoke();
    // expect(proxy).to.equal(coinAddress);

    const newProxy2 = await this.register.connect(user2).proxies(user2.address);
    console.log(newProxy2);
    console.log("proxy2 ", newProxy2);
    const ownerDelegatorInstance =
      await this.ownableDelegateProxyFactory.attach(newProxy2);
    const authenticatedProxyInstance2 = await this.authenticatedProxy.attach(
      newProxy2
    );
    // await authenticatedProxyInstance2.setRevoke();
    const impl = await ownerDelegatorInstance.implementation();

    expect(impl).to.equal(await this.register.delegateProxyImplementation());

    // await expect(this.eRC721Instance["mint(address)"](user1.address)).to.emit(
    //   this.eRC721Instance,
    //   "Transfer"
    // );

    const balance = await this.eRC721Instance.balanceOf(user1.address);
    console.log(balance);
    const tokenId = await this.eRC721Instance.tokenOfOwnerByIndex(
      user1.address,
      0
    );
    console.log(tokenId);
    await this.eRC721Instance.connect(user1).approve(proxy, tokenId);
    console.log("generate  hash");
    const saleOrder = await createSaleOrder(
      user1,
      this.exchange.address,
      this.exchangeOperator,
      {
        maker: user1.address,
        price: "1",
        tokenId: "0",
      }
    );
    const paramsSale = extractParams(saleOrder);

    // const hash1 = await getExchangeOperatorContractHash(
    //   this.exchangeOperator,
    //   saleOrder
    // );
    // const hash2 = await getExchangeOperatorContractHash2(
    //   this.exchangeOperator,
    //   saleOrder
    // );
    // console.log("hash", hash1, hash2);
    // const txs = await this.exchangeOperator
    //   .connect(user1)
    //   .approveOrder_(
    //     paramsSale.addrs,
    //     paramsSale.uints,
    //     paramsSale.feeMethod,
    //     paramsSale.side,
    //     paramsSale.saleKind,
    //     paramsSale.howToCall,
    //     paramsSale.data,
    //     paramsSale.replacementPattern,
    //     paramsSale.staticExtradata,
    //     true
    //   );
    // waitForTx(ethers.provider, txs.hash);

    const validRes = await this.exchangeOperator.validateOrderParameters_(
      paramsSale.addrs,
      paramsSale.uints,
      paramsSale.feeMethod,
      paramsSale.side,
      paramsSale.saleKind,
      paramsSale.howToCall,
      paramsSale.data,
      paramsSale.replacementPattern,
      paramsSale.staticExtradata
    );
    console.log(validRes);
    const appRes = await this.exchange.approvedOrders(saleOrder.hash);
    console.log("appRes", appRes);
    const { r, s, v } = ethers.utils.splitSignature(saleOrder.signature);
    const [r2, s2, v2] = getRSVFromSignature(saleOrder.signature);
    console.log("start sale valid1", v, r, s);
    console.log("start sale valid2", v2, r2, s2);
    const vres = await this.exchangeOperator
      .connect(user1)
      .validateOrder_(
        paramsSale.addrs,
        paramsSale.uints,
        paramsSale.feeMethod,
        paramsSale.side,
        paramsSale.saleKind,
        paramsSale.howToCall,
        paramsSale.data,
        paramsSale.replacementPattern,
        paramsSale.staticExtradata,
        v2,
        [r2, s2]
      );

    const vr = await this.exchangeOperator.validateOrderHash(
      saleOrder.hash,
      v2,
      [r2, s2]
    );
    console.log(vr);
    console.log("validator1 ", vres);
    const buyOrder = await createBuyOrder(
      user2,
      this.exchange.address,
      this.eRC721Instance,
      this.exchangeOperator,
      {
        maker: user2.address,
        target: this.eRC721Instance.address,
        tokenId: "0",
      },
      saleOrder
    );

    const paramsBuy = extractParams(buyOrder);

    // const approveTx = await this.exchangeOperator
    //   .connect(user2)
    //   .approveOrder_(
    //     paramsBuy.addrs,
    //     paramsBuy.uints,
    //     paramsBuy.feeMethod,
    //     paramsBuy.side,
    //     paramsBuy.saleKind,
    //     paramsBuy.howToCall,
    //     paramsBuy.data,
    //     paramsBuy.replacementPattern,
    //     paramsBuy.staticExtradata,
    //     true
    //   );
    // waitForTx(ethers.provider, approveTx.hash);
    const [r1, s1, v1] = getRSVFromSignature(buyOrder.signature);
    const vres1 = await this.exchangeOperator
      .connect(user2)
      .validateOrder_(
        paramsBuy.addrs,
        paramsBuy.uints,
        paramsBuy.feeMethod,
        paramsBuy.side,
        paramsBuy.saleKind,
        paramsBuy.howToCall,
        paramsBuy.data,
        paramsBuy.replacementPattern,
        paramsBuy.staticExtradata,
        v1,
        [r1, s1]
      );
    console.log("validator2 ", vres1);
    console.log("local validat1", await validateOrder(saleOrder));
    console.log("local validat2", await validateOrder(buyOrder));
    const tx = await sendTransaction(
      user2,
      buyOrder,
      saleOrder,
      this.exchangeOperator
    );
    waitForTx(ethers.provider, tx.hash);
    const balance2 = await this.eRC721Instance.balanceOf(user2.address);
    console.log(balance2);
    // console.log(user1.address);
    // const owner = await this.eRC721Instance.ownerOf(0);
    // console.log(owner);
  });

  xit("sign", async function () {
    // const messageHash = ethers.utils.solidityKeccak256(
    //   ["string"],
    //   ["0xf5348b0D6eb820691F794f6b37e4CE3b4bBA2061"]
    // );
    const messageHash =
      "0xb09bd05040accd347b5b6823d5c6f2af310a555153e93127494f064ebca85d36";
    console.log("hash", messageHash);
    const signature = await sign(user1, messageHash);
    console.log("sig", signature);
    const { r, s, v } = ethers.utils.splitSignature(signature);
    console.log(r, s, v);
  });
});
