import { expect } from "chai";
import { BigNumber, Contract, providers } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethToWei, weiToEth } from "./Utils";
import { emit } from "process";

const ADDRESS_ZERO = ethers.constants.AddressZero;
const PRECISION = 0.0001;

describe("FreeCity Exchange", () => {
  let owner: SignerWithAddress;
  let sellerProxy: Contract;
  let buyerProxy: Contract;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let token: Contract;
  let proxyRegistry: Contract;
  let erc721: Contract;
  let exchange: Contract;
  const protocolFee = 500;
  let sellerAddrs: string[];
  let sellerUints: any[];
  let buyerAddrs: string[];
  let buyerUints: any[];

  beforeEach(async function () {
    [owner, seller, buyer, feeRecipient] = await ethers.getSigners();
    this.timeout(5000000);
    const tokenBluePrint = await ethers.getContractFactory("MyToken");
    token = await tokenBluePrint.deploy();
    await token.mint(seller.address, ethToWei(100));
    await token.mint(buyer.address, ethToWei(100));

    const proxyRegistryBluePrint = await ethers.getContractFactory(
      "FreeCityProxyRegistry"
    );
    proxyRegistry = await proxyRegistryBluePrint.deploy();

    const erc721BluePrint = await ethers.getContractFactory("ERC721Instance");
    erc721 = await erc721BluePrint.deploy("FCM", "FCM", "");

    const exchangeBluePrint = await ethers.getContractFactory(
      "FreeCityExchange"
    );
    exchange = await exchangeBluePrint.deploy(
      proxyRegistry.address,
      protocolFee,
      feeRecipient.address
    );

    await proxyRegistry.connect(seller).registerProxy();
    await proxyRegistry.connect(buyer).registerProxy();
    await proxyRegistry.grantAuthentication(exchange.address);
    await expect(erc721["mint(address)"](seller.address)).to.emit(
      erc721,
      "Transfer"
    );
    await expect(erc721["mint(address)"](seller.address)).to.emit(
      erc721,
      "Transfer"
    );

    const tokenId = await erc721.balanceOf(seller.address);
    console.log(tokenId);
    const sellerProxyAddress = await proxyRegistry.proxies(seller.address);
    sellerProxy = await ethers.getContractAt(
      "AuthenticatedProxy",
      sellerProxyAddress
    );
    const buyerProxyAddress = await proxyRegistry.proxies(buyer.address);
    buyerProxy = await ethers.getContractAt(
      "AuthenticatedProxy",
      buyerProxyAddress
    );

    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    const tomorrowInSeconds = Math.floor(tomorrow.getTime() / 1000);

    const weekFromNow = new Date();
    weekFromNow.setHours(weekFromNow.getHours() + 24 * 7);
    const weekFromNowInSeconds = Math.floor(weekFromNow.getTime() / 1000);

    sellerAddrs = [
      exchange.address,
      seller.address,
      buyer.address,
      seller.address,
      ADDRESS_ZERO,
      erc721.address,
    ];

    sellerUints = [
      0,
      ethToWei(1.5),
      tomorrowInSeconds,
      weekFromNowInSeconds,
      1234,
    ];

    buyerAddrs = [
      exchange.address,
      seller.address,
      buyer.address,
      buyer.address,
      ADDRESS_ZERO,
      erc721.address,
    ];

    buyerUints = [
      0,
      ethToWei(1.7),
      tomorrowInSeconds,
      weekFromNowInSeconds,
      5433,
    ];
    console.log("before,over");
  });

  it("should initialize", async function () {
    expect(await exchange.name()).to.equal("FreeCity Exchange");
    expect(await exchange.version()).to.equal("1.0");
    expect(await exchange.codename()).to.equal("FreeCity");
    expect(await exchange.registry()).to.equal(proxyRegistry.address);
    expect(await exchange.protocolFee()).to.equal(protocolFee);
    expect(await exchange.protocolFeeRecipient()).to.equal(
      feeRecipient.address
    );
    console.log("exchange valid over");
  });

  describe("Price Calculation", () => {
    it("should calculate final price", async () => {
      const sellerPrice = ethToWei(0.5);
      const buyerPrice = ethToWei(0.6);

      expect(
        await exchange.calculateFinalPrice(sellerPrice, buyerPrice)
      ).to.equal(buyerPrice);
    });

    it("should revert if buyer price is lower than seller", async () => {
      const sellerPrice = ethToWei(0.5);
      const buyerPrice = ethToWei(0.4);

      await expect(exchange.calculateFinalPrice(sellerPrice, buyerPrice)).to.be
        .reverted;
    });
  });

  describe("Order", () => {
    it("should hash order", async () => {
      const hash = await exchange.hashOrder_(sellerAddrs, sellerUints);
      const sameHash = await exchange.hashOrder_(sellerAddrs, sellerUints);

      expect(hash).to.equal(sameHash);
    });

    it("should validate order parameters", async () => {
      expect(
        await exchange.validateOrderParameters_(sellerAddrs, sellerUints)
      ).to.equal(true);
    });

    it("should validate order", async () => {
      const orderHash = await exchange.hashOrder_(sellerAddrs, sellerUints);
      const signedMessage = await seller.signMessage(
        ethers.utils.arrayify(orderHash)
      );

      expect(
        await exchange.validateOrder_(sellerAddrs, sellerUints, signedMessage)
      ).to.equal(true);
    });

    it("should cancel order", async () => {
      const orderHash = await exchange.hashOrder_(sellerAddrs, sellerUints);
      const orderHashToSign = await exchange.hashToSign_(
        sellerAddrs,
        sellerUints
      );
      const signedMessage = await seller.signMessage(
        ethers.utils.arrayify(orderHash)
      );

      expect(await exchange.cancelledOrFinalized(orderHashToSign)).to.equal(
        false
      );

      await expect(
        exchange
          .connect(seller)
          .cancelOrder_(sellerAddrs, sellerUints, signedMessage)
      ).to.emit(exchange, "OrderCancelled");

      expect(await exchange.cancelledOrFinalized(orderHashToSign)).to.equal(
        true
      );
    });
  });

  describe("Orders Matching", () => {
    let dayBeforeLastBlockInSeconds: number;
    let weekFromDayBeforeLastBlockInSeconds: number;

    beforeEach(async () => {
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const lastBlockTime = blockBefore.timestamp;
      const lastBlockDate = new Date(lastBlockTime * 1000);
      lastBlockDate.setHours(lastBlockDate.getHours() - 24);
      dayBeforeLastBlockInSeconds = Math.floor(lastBlockDate.getTime() / 1000);

      lastBlockDate.setHours(lastBlockDate.getHours() + 24 * 7);
      weekFromDayBeforeLastBlockInSeconds = Math.floor(
        lastBlockDate.getTime() / 1000
      );
    });

    it("should match valid orders", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(true);
    });

    it("should match valid orders offered to anyone", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(true);
    });

    it("should match valid orders with token address", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        token.address,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        token.address,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(true);
    });

    it("shoud not match orders with unmatching exchange", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        owner.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(false);
    });

    it("should not match if buyer and seller are not the same", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        feeRecipient.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(false);
    });

    it("should not match if token address does not match", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        token.address,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(false);
    });

    it("should not match if token id does not match", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        token.address,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        token.address,
        erc721.address,
      ];

      buyerUints = [
        1,
        ethToWei(1.7),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(false);
    });

    it("should not match if buyer price is less than seller price", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        token.address,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        token.address,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.4),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(false);
    });

    it("should not match expired orders", async () => {
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const lastBlockTime = blockBefore.timestamp;
      const lastBlockDate = new Date(lastBlockTime * 1000);
      lastBlockDate.setHours(lastBlockDate.getHours() - 24 * 7);
      const weekBeforeLastBlockInSeconds = Math.floor(
        lastBlockDate.getTime() / 1000
      );

      sellerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        weekBeforeLastBlockInSeconds,
        dayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        weekBeforeLastBlockInSeconds,
        dayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(false);
    });

    it("should not match orders with invalid date", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        weekFromDayBeforeLastBlockInSeconds,
        dayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        weekFromDayBeforeLastBlockInSeconds,
        dayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(false);
    });

    it("should not match orders with expired seller listing", async () => {
      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        token.address,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(1.5),
        weekFromDayBeforeLastBlockInSeconds,
        dayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        token.address,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(1.7),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      const TWO_DAYS = 2 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [TWO_DAYS]);

      expect(await exchange.ordersCanMatch_(addrs, uints)).to.equal(false);
    });
  });

  describe("Flow", () => {
    let dayBeforeLastBlockInSeconds: number;
    let weekFromDayBeforeLastBlockInSeconds: number;

    beforeEach(async () => {
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const lastBlockTime = blockBefore.timestamp;
      const lastBlockDate = new Date(lastBlockTime * 1000);
      lastBlockDate.setHours(lastBlockDate.getHours() - 24);
      dayBeforeLastBlockInSeconds = Math.floor(lastBlockDate.getTime() / 1000);

      lastBlockDate.setHours(lastBlockDate.getHours() + 24 * 7);
      weekFromDayBeforeLastBlockInSeconds = Math.floor(
        lastBlockDate.getTime() / 1000
      );
    });

    it("should emit events on order execution", async () => {
      const price = 1.5;

      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(price),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(price),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const buyOrderHash = await exchange.hashOrder_(buyerAddrs, buyerUints);
      const buyerSignature = await buyer.signMessage(
        ethers.utils.arrayify(buyOrderHash)
      );

      const sellOrderHash = await exchange.hashOrder_(sellerAddrs, sellerUints);
      const sellerSignature = await seller.signMessage(
        ethers.utils.arrayify(sellOrderHash)
      );

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      await erc721.connect(seller).setApprovalForAll(sellerProxy.address, true);

      await expect(
        exchange
          .connect(buyer)
          .atomicMatch_(addrs, uints, buyerSignature, sellerSignature, {
            value: ethToWei(price),
          })
      ).to.emit(exchange, "OrdersMatched");
    });

    it("should not execute the same order twice", async () => {
      const price = 0.1;

      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(price),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(price),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const buyOrderHash = await exchange.hashOrder_(buyerAddrs, buyerUints);
      const buyerSignature = await buyer.signMessage(
        ethers.utils.arrayify(buyOrderHash)
      );

      const sellOrderHash = await exchange.hashOrder_(sellerAddrs, sellerUints);
      const sellerSignature = await seller.signMessage(
        ethers.utils.arrayify(sellOrderHash)
      );

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      await erc721.connect(seller).setApprovalForAll(sellerProxy.address, true);
      await erc721["mint(address)"](seller.address);

      await exchange
        .connect(buyer)
        .atomicMatch_(addrs, uints, buyerSignature, sellerSignature, {
          value: ethToWei(price),
        });

      await expect(
        exchange
          .connect(buyer)
          .atomicMatch_(addrs, uints, buyerSignature, sellerSignature, {
            value: ethToWei(price),
          })
      ).to.be.reverted;
    });

    it("should not execture order if seller cancelled order", async () => {
      const price = 1.1234;

      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(price),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(price),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const buyOrderHash = await exchange.hashOrder_(buyerAddrs, buyerUints);
      const buyerSignature = await buyer.signMessage(
        ethers.utils.arrayify(buyOrderHash)
      );

      const sellOrderHash = await exchange.hashOrder_(sellerAddrs, sellerUints);
      const sellerSignature = await seller.signMessage(
        ethers.utils.arrayify(sellOrderHash)
      );

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      await erc721.connect(seller).setApprovalForAll(sellerProxy.address, true);
      await erc721["mint(address)"](seller.address);

      expect(await erc721.ownerOf(0)).to.equal(seller.address);

      await exchange
        .connect(seller)
        .cancelOrder_(sellerAddrs, sellerUints, sellerSignature);

      await expect(
        exchange
          .connect(buyer)
          .atomicMatch_(addrs, uints, buyerSignature, sellerSignature, {
            value: ethToWei(price),
          })
      ).to.be.reverted;
    });

    it("should not execture order if buyer cancelled order", async () => {
      const price = 1.1234;

      sellerAddrs = [
        exchange.address,
        seller.address,
        ADDRESS_ZERO,
        seller.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      sellerUints = [
        0,
        ethToWei(price),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        1234,
      ];

      buyerAddrs = [
        exchange.address,
        seller.address,
        buyer.address,
        buyer.address,
        ADDRESS_ZERO,
        erc721.address,
      ];

      buyerUints = [
        0,
        ethToWei(price),
        dayBeforeLastBlockInSeconds,
        weekFromDayBeforeLastBlockInSeconds,
        5433,
      ];

      const buyOrderHash = await exchange.hashOrder_(buyerAddrs, buyerUints);
      const buyerSignature = await buyer.signMessage(
        ethers.utils.arrayify(buyOrderHash)
      );

      const sellOrderHash = await exchange.hashOrder_(sellerAddrs, sellerUints);
      const sellerSignature = await seller.signMessage(
        ethers.utils.arrayify(sellOrderHash)
      );

      const addrs = buyerAddrs.concat(sellerAddrs);
      const uints = buyerUints.concat(sellerUints);

      await erc721.connect(seller).setApprovalForAll(sellerProxy.address, true);

      expect(await erc721.ownerOf(0)).to.equal(seller.address);

      await exchange
        .connect(buyer)
        .cancelOrder_(buyerAddrs, buyerUints, buyerSignature);

      await expect(
        exchange
          .connect(buyer)
          .atomicMatch_(addrs, uints, buyerSignature, sellerSignature, {
            value: ethToWei(price),
          })
      ).to.be.reverted;
    });
  });
});
