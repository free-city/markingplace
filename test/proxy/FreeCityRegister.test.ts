import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const ADDRESS_ZERO = ethers.constants.AddressZero;

describe("Initialization", () => {
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let proxyRegistry: Contract;
  let delegateWithProxyMethods: Contract;

  beforeEach(async () => {
    [owner, signer] = await ethers.getSigners();

    const proxyRegistryBluePrint = await ethers.getContractFactory(
      "PlaytipusRegistry"
    );
    proxyRegistry = await proxyRegistryBluePrint.deploy();

    const delegateProxy = await proxyRegistry.delegateProxyImplementation();
    delegateWithProxyMethods = await ethers.getContractAt(
      "AuthenticatedProxy",
      delegateProxy
    );
  });

  it("should deploy successfuly", async () => {
    expect(delegateWithProxyMethods.address).to.not.equal(ADDRESS_ZERO);
    expect(await delegateWithProxyMethods.revoked()).to.equal(true);
    expect(await proxyRegistry.initialAddressSet()).to.equal(false);
  });
});

describe("Initial Authentication", async () => {
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let proxyRegistry: Contract;

  beforeEach(async () => {
    [owner, signer] = await ethers.getSigners();

    const proxyRegistryBluePrint = await ethers.getContractFactory(
      "PlaytipusRegistry"
    );
    proxyRegistry = await proxyRegistryBluePrint.deploy();
  });

  it("should grand initial authentication", async () => {
    await proxyRegistry.grantAuthentication(signer.address);

    expect(await proxyRegistry.initialAddressSet()).to.equal(true);
    expect(await proxyRegistry.contracts(signer.address)).to.equal(true);
  });

  it("should not grant initial authentication more than once", async () => {
    await proxyRegistry.grantAuthentication(signer.address);
    await expect(proxyRegistry.grantAuthentication(signer.address)).to.be
      .reverted;
  });

  it("should not grand initial authentication if not owner", async () => {
    const signerProxyRegistry = proxyRegistry.connect(signer);
    await expect(signerProxyRegistry.grantAuthentication(signer.address))
      .to.be.reverted;
  });
});

describe("Contract Authentication", function () {
  let owner: SignerWithAddress;
  let signerA: SignerWithAddress;
  let signerB: SignerWithAddress;
  let proxyRegistry: Contract;

  beforeEach(async () => {
    [owner, signerA, signerB] = await ethers.getSigners();

    const proxyRegistryBluePrint = await ethers.getContractFactory(
      "PlaytipusRegistry"
    );
    proxyRegistry = await proxyRegistryBluePrint.deploy();

    await proxyRegistry.grantAuthentication(signerA.address);
  });

  it("should add pending contract authentication", async () => {
    expect(await proxyRegistry.contracts(signerB.address)).to.equal(false);
    expect(await proxyRegistry.pending(signerB.address)).to.equal(0);

    await proxyRegistry.startGrantAuthentication(signerB.address);

    expect(await proxyRegistry.contracts(signerB.address)).to.equal(false);
    expect(await proxyRegistry.pending(signerB.address)).to.not.equal(0);
  });

  it("should end contract authentication granting", async () => {
    await proxyRegistry.startGrantAuthentication(signerB.address);

    const TWO_WEEKS = 14 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [TWO_WEEKS + 1]);

    await proxyRegistry.endGrantAuthentication(signerB.address);

    expect(await proxyRegistry.pending(signerB.address)).to.equal(0);
    expect(await proxyRegistry.contracts(signerB.address)).to.equal(true);
  });

  it("should not end contract authentication granting in first two weeks", async () => {
    await proxyRegistry.startGrantAuthentication(signerB.address);

    const TWO_WEEKS = 14 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [TWO_WEEKS]);

    await expect(proxyRegistry.endGrantAuthentication(signerB.address)).to.be
      .reverted;

    expect(await proxyRegistry.contracts(signerB.address)).to.equal(false);
    expect(await proxyRegistry.pending(signerB.address)).to.not.equal(0);
  });

  it("should revoke authentication immediatly", async () => {
    await proxyRegistry.startGrantAuthentication(signerB.address);
    const TWO_WEEKS = 14 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [TWO_WEEKS + 1]);
    await proxyRegistry.endGrantAuthentication(signerB.address);

    expect(await proxyRegistry.contracts(signerB.address)).to.equal(true);

    await proxyRegistry.revokeAuthentication(signerB.address);

    expect(await proxyRegistry.contracts(signerB.address)).to.equal(false);
  });

  it("should revoke initially authenticated contract", async () => {
    expect(await proxyRegistry.contracts(signerA.address)).to.equal(true);

    await proxyRegistry.revokeAuthentication(signerA.address);

    expect(await proxyRegistry.contracts(signerA.address)).to.equal(false);
  });

  it("should not start authentication if not owner", async () => {
    const signerProxyRegistry = proxyRegistry.connect(signerA);
    await expect(signerProxyRegistry.startGrantAuthentication(signerB.address))
      .to.be.reverted;
  });

  it("should not grant authentication if not owner", async () => {
    await proxyRegistry.startGrantAuthentication(signerB.address);
    const TWO_WEEKS = 14 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [TWO_WEEKS + 1]);
    const signerProxyRegistry = proxyRegistry.connect(signerA);
    await expect(signerProxyRegistry.endGrantAuthentication(signerB.address)).to
      .be.reverted;
  });
});

describe("Proxy Registering", () => {
  // eslint-disable-next-line no-unused-vars
  let owner: SignerWithAddress;
  let signerA: SignerWithAddress;
  let signerB: SignerWithAddress;
  let proxyRegistry: Contract;

  beforeEach(async () => {
    [owner, signerA, signerB] = await ethers.getSigners();

    const proxyRegistryBluePrint = await ethers.getContractFactory(
      "PlaytipusRegistry"
    );
    proxyRegistry = await proxyRegistryBluePrint.deploy();

    await proxyRegistry.grantAuthentication(signerA.address);
  });

  it("should register new proxy", async () => {
    expect(await proxyRegistry.proxies(signerB.address)).to.equal(ADDRESS_ZERO);

    const signerProxyRegistry = proxyRegistry.connect(signerB);
    await signerProxyRegistry.registerProxy();

    expect(await proxyRegistry.proxies(signerB.address)).to.not.equal(
      ADDRESS_ZERO
    );

    const proxy = await proxyRegistry.proxies(signerB.address);
    const proxyWithMethods = await ethers.getContractAt(
      "AuthenticatedProxy",
      proxy
    );

    expect(await proxyWithMethods.registry()).to.equal(proxyRegistry.address);
    expect(await proxyWithMethods.user()).to.equal(signerB.address);
    expect(await proxyWithMethods.revoked()).to.equal(false);
  });
});
