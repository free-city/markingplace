/* eslint-disable no-unused-vars */
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const ADDRESS_ZERO = ethers.constants.AddressZero;

/* Delegate call could be used to atomically transfer multiple assets owned by the proxy contract with one order. */
enum HowToCall {
  Call,
  DelegateCall,
}

describe("Initialization", () => {
  let proxy: Contract;
  // eslint-disable-next-line no-unused-vars
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let proxyRegistry: Contract;

  beforeEach(async () => {
    [owner, signer] = await ethers.getSigners();
    const authentcatedProxyBluePrint = await ethers.getContractFactory(
      "AuthenticatedProxy"
    );
    proxy = await authentcatedProxyBluePrint.deploy();

    const proxyRegistryBluePrint = await ethers.getContractFactory(
      "PlaytipusRegistry"
    );
    proxyRegistry = await proxyRegistryBluePrint.deploy();
  });

  it("should deploy successfuly", async () => {
    expect(await proxy.user()).to.equal(ADDRESS_ZERO);
    expect(await proxy.registry()).to.equal(ADDRESS_ZERO);
    expect(await proxy.revoked()).to.equal(false);
  });

  it("should initialize", async () => {
    await proxy.initialize(signer.address, proxyRegistry.address);

    expect(await proxy.user()).to.equal(signer.address);
    expect(await proxy.registry()).to.equal(proxyRegistry.address);
    expect(await proxy.revoked()).to.equal(false);
  });

  it("should not initialize twice", async () => {
    await proxy.initialize(signer.address, proxyRegistry.address);

    await expect(proxy.initialize(signer.address, proxyRegistry.address)).to.be
      .reverted;
  });
});

describe("Proxy", function () {
  let proxy: Contract;
  let owner: SignerWithAddress;
  let signerA: SignerWithAddress;
  let signerB: SignerWithAddress;
  let proxyRegistry: Contract;
  let erc721: Contract;

  beforeEach(async function () {
    [owner, signerA, signerB] = await ethers.getSigners();
    const authentcatedProxyBluePrint = await ethers.getContractFactory(
      "AuthenticatedProxy"
    );
    proxy = await authentcatedProxyBluePrint.deploy();

    const proxyRegistryBluePrint = await ethers.getContractFactory(
      "PlaytipusRegistry"
    );
    proxyRegistry = await proxyRegistryBluePrint.deploy();
    await proxyRegistry.grantInitialAuthentication(owner.address);

    const targetBluePrint = await ethers.getContractFactory("PlaytipusERC721");
    erc721 = await targetBluePrint.deploy();
    await erc721.safeMint(signerA.address, "URI_A");

    await proxy.initialize(signerA.address, proxyRegistry.address);
  });

  describe("should proxy", async () => {
    it("should call proxy for authorized contract", async function () {
      expect(await erc721.ownerOf(0)).to.equal(signerA.address);
      await erc721.connect(signerA).approve(proxy.address, 0);

      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await proxy.proxy(erc721.address, HowToCall.Call, signature);

      expect(await erc721.ownerOf(0)).to.equal(signerB.address);
    });

    it("should call proxy for owner", async () => {
      expect(await erc721.ownerOf(0)).to.equal(signerA.address);
      await erc721.connect(signerA).approve(proxy.address, 0);

      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await proxy
        .connect(signerA)
        .proxy(erc721.address, HowToCall.Call, signature);

      expect(await erc721.ownerOf(0)).to.equal(signerB.address);
    });
  });

  describe("should not proxy", async () => {
    it("should not proxy for unauthorized contract", async function () {
      const signerContract = proxy.connect(signerB);

      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await expect(
        signerContract.proxy(erc721.address, HowToCall.Call, signature)
      ).to.be.reverted;
    });

    it("should not proxy after being revoked", async () => {
      const signerContract = proxy.connect(signerA);
      await signerContract.setRevoke(true);

      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await expect(proxy.proxy(erc721.address, HowToCall.Call, signature)).to.be
        .reverted;
    });
  });

  describe("revoke", async () => {
    it("should not revoke if sender is not owner", async () => {
      await expect(proxy.setRevoke(true)).to.be.reverted;
    });

    it("should set revoked", async function () {
      const signerContract = proxy.connect(signerA);
      await signerContract.setRevoke(true);

      expect(await proxy.revoked()).to.equal(true);

      await signerContract.setRevoke(false);

      expect(await proxy.revoked()).to.equal(false);
    });

    it("should emit revoked event", async () => {
      const signerContract = proxy.connect(signerA);
      expect(await signerContract.setRevoke(true))
        .to.emit(signerContract, "Revoked")
        .withArgs(true);

      expect(await signerContract.setRevoke(false))
        .to.emit(signerContract, "Revoked")
        .withArgs(false);
    });
  });

  describe("proxyAssert", async () => {
    it("should proxy", async () => {
      expect(await erc721.ownerOf(0)).to.equal(signerA.address);
      await erc721.connect(signerA).approve(proxy.address, 0);

      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await proxy.proxyAssert(erc721.address, HowToCall.Call, signature);

      expect(await erc721.ownerOf(0)).to.equal(signerB.address);
    });

    it("should assert on unauthorized proxy call", async () => {
      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await expect(proxy.proxyAssert(erc721.address, HowToCall.Call, signature))
        .to.be.reverted;
    });
  });
});
