/* eslint-disable no-unused-vars */
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

/* Delegate call could be used to atomically transfer multiple assets owned by the proxy contract with one order. */
// eslint-disable-next-line no-unused-vars
enum HowToCall {
  Call,
  DelegateCall,
}

describe("Initialization", () => {
  let owner: SignerWithAddress;
  let signerA: SignerWithAddress;
  let proxyRegistry: Contract;
  let delegateProxy: Contract;
  let delegateWithProxyMethods: Contract;

  beforeEach(async () => {
    [owner, signerA] = await ethers.getSigners();
    const authentcatedProxyBluePrint = await ethers.getContractFactory(
      "AuthenticatedProxy"
    );
    const proxy = await authentcatedProxyBluePrint.deploy();

    const proxyRegistryBluePrint = await ethers.getContractFactory(
      "PlaytipusRegistry"
    );
    proxyRegistry = await proxyRegistryBluePrint.deploy();

    const ABI = ["function initialize(address addrUser, address addrRegistry)"];
    const iface = new ethers.utils.Interface(ABI);
    const signature = iface.encodeFunctionData("initialize", [
      signerA.address,
      proxyRegistry.address,
    ]);

    const delegateProxyBlueprint = await ethers.getContractFactory(
      "OwnableDelegateProxy"
    );
    delegateProxy = await delegateProxyBlueprint.deploy(
      signerA.address,
      proxy.address,
      signature
    );
    delegateWithProxyMethods = await ethers.getContractAt(
      "AuthenticatedProxy",
      delegateProxy.address
    );
  });

  it("should initialize", async () => {
    expect(await delegateWithProxyMethods.user()).to.equal(signerA.address);
    expect(await delegateWithProxyMethods.registry()).to.equal(
      proxyRegistry.address
    );
    expect(await delegateWithProxyMethods.revoked()).to.equal(false);
  });
});

describe("proxy", () => {
  let owner: SignerWithAddress;
  let signerA: SignerWithAddress;
  let signerB: SignerWithAddress;
  let proxyRegistry: Contract;
  let proxy: Contract;
  let erc721: Contract;
  let delegateProxy: Contract;
  let delegateWithProxyMethods: Contract;

  beforeEach(async () => {
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
    await erc721.safeMint(signerA.address, "URI_B");

    const ABI = ["function initialize(address addrUser, address addrRegistry)"];
    const iface = new ethers.utils.Interface(ABI);
    const signature = iface.encodeFunctionData("initialize", [
      signerA.address,
      proxyRegistry.address,
    ]);

    const delegateProxyBlueprint = await ethers.getContractFactory(
      "OwnableDelegateProxy"
    );
    delegateProxy = await delegateProxyBlueprint.deploy(
      signerA.address,
      proxy.address,
      signature
    );
    delegateWithProxyMethods = await ethers.getContractAt(
      "AuthenticatedProxy",
      delegateProxy.address
    );
  });

  describe("should proxy", async () => {
    it("should call proxy for authorized contract", async function () {
      expect(await erc721.ownerOf(0)).to.equal(signerA.address);
      await erc721
        .connect(signerA)
        .approve(delegateWithProxyMethods.address, 0);

      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await delegateWithProxyMethods.proxy(
        erc721.address,
        HowToCall.Call,
        signature
      );

      expect(await erc721.ownerOf(0)).to.equal(signerB.address);
    });

    it("should call proxy for owner", async () => {
      expect(await erc721.ownerOf(0)).to.equal(signerA.address);
      await erc721
        .connect(signerA)
        .approve(delegateWithProxyMethods.address, 0);

      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await delegateWithProxyMethods
        .connect(signerA)
        .proxy(erc721.address, HowToCall.Call, signature);

      expect(await erc721.ownerOf(0)).to.equal(signerB.address);
    });
  });

  describe("should not proxy", async () => {
    it("should not proxy for unauthorized contract", async function () {
      const signerContract = delegateWithProxyMethods.connect(signerB);

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
      const signerContract = delegateWithProxyMethods.connect(signerA);
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
      await expect(
        delegateWithProxyMethods.proxy(
          erc721.address,
          HowToCall.Call,
          signature
        )
      ).to.be.reverted;
    });
  });

  describe("revoke", async () => {
    it("should not revoke if sender is not owner", async () => {
      await expect(delegateWithProxyMethods.setRevoke(true)).to.be.reverted;
    });

    it("should set revoked", async function () {
      const signerContract = delegateWithProxyMethods.connect(signerA);
      await signerContract.setRevoke(true);

      expect(await signerContract.revoked()).to.equal(true);

      await signerContract.setRevoke(false);

      expect(await signerContract.revoked()).to.equal(false);
    });

    it("should emit revoked event", async () => {
      const signerContract = delegateWithProxyMethods.connect(signerA);
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
      await erc721
        .connect(signerA)
        .approve(delegateWithProxyMethods.address, 0);

      const ABI = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const iface = new ethers.utils.Interface(ABI);
      const signature = iface.encodeFunctionData("safeTransferFrom", [
        signerA.address,
        signerB.address,
        0,
      ]);
      await delegateWithProxyMethods.proxyAssert(
        erc721.address,
        HowToCall.Call,
        signature
      );

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
      await expect(
        delegateWithProxyMethods.proxyAssert(
          erc721.address,
          HowToCall.Call,
          signature
        )
      ).to.be.reverted;
    });
  });

  describe("upgrade", async () => {
    it("should upgrade contract", async () => {
      const erc721BluePrint = await ethers.getContractFactory(
        "PlaytipusERC721"
      );
      const newProxied = await erc721BluePrint.deploy();

      expect(await delegateWithProxyMethods.revoked()).to.equal(false);

      const signerContract = delegateProxy.connect(signerA);
      await signerContract.upgradeTo(newProxied.address);

      await expect(delegateWithProxyMethods.revoked()).to.be.reverted;
    });

    it("should maintain approvals on contract upgrading", async () => {
      expect(await erc721.ownerOf(0)).to.equal(signerA.address);
      expect(await erc721.ownerOf(1)).to.equal(signerA.address);

      await erc721
        .connect(signerA)
        .setApprovalForAll(delegateWithProxyMethods.address, true);

      const ABITransfer = [
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
      ];
      const ifaceTransfer = new ethers.utils.Interface(ABITransfer);
      const transferSignature = ifaceTransfer.encodeFunctionData(
        "safeTransferFrom",
        [signerA.address, signerB.address, 0]
      );
      await delegateWithProxyMethods.proxyAssert(
        erc721.address,
        HowToCall.Call,
        transferSignature
      );

      expect(await erc721.ownerOf(0)).to.equal(signerB.address);
      expect(await erc721.ownerOf(1)).to.equal(signerA.address);

      const proxyBluePrint = await ethers.getContractFactory(
        "AuthenticatedProxy"
      );
      const newProxied = await proxyBluePrint.deploy();

      const signerContract = delegateProxy.connect(signerA);
      await signerContract.upgradeTo(newProxied.address);

      const secondTransferSignature = ifaceTransfer.encodeFunctionData(
        "safeTransferFrom",
        [signerA.address, signerB.address, 1]
      );
      await delegateWithProxyMethods.proxyAssert(
        erc721.address,
        HowToCall.Call,
        secondTransferSignature
      );

      expect(await erc721.ownerOf(0)).to.equal(signerB.address);
      expect(await erc721.ownerOf(1)).to.equal(signerB.address);
    });
  });
});
