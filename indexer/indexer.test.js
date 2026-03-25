// indexer/indexer.test.js
// Run: npm test (needs jest in devDependencies)
const { ethers } = require("ethers");
const request = require("supertest");

const {
  store,
  onCampaignRegistered,
  onMilestoneCreated,
  onMilestoneFunded,
  onMilestoneSubmitted,
  onMilestoneApproved,
  onMilestoneRejected,
  onMilestoneVoted,
  buildApi,
} = require("./index");

// Reset store before each test
beforeEach(() => {
  Object.keys(store.milestones).forEach((k) => delete store.milestones[k]);
  Object.keys(store.campaigns).forEach((k) => delete store.campaigns[k]);
});

const ONE_ETH = ethers.BigNumber.from("1000000000000000000");
const HALF_ETH = ethers.BigNumber.from("500000000000000000");

describe("Indexer store handlers", () => {
  it("registers a campaign", () => {
    onCampaignRegistered(ethers.BigNumber.from(1), "0xCreator");
    expect(store.campaigns["1"].creator).toBe("0xCreator");
  });

  it("creates a milestone", () => {
    onCampaignRegistered(ethers.BigNumber.from(1), "0xCreator");
    onMilestoneCreated(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "MVP", ONE_ETH, ethers.BigNumber.from(9999999));
    const m = store.milestones["1"]["1"];
    expect(m.title).toBe("MVP");
    expect(m.status).toBe("Pending");
  });

  it("accumulates funded amounts", () => {
    onMilestoneCreated(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "MVP", ONE_ETH, ethers.BigNumber.from(0));
    onMilestoneFunded(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "0xBacker1", HALF_ETH);
    onMilestoneFunded(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "0xBacker2", HALF_ETH);
    const m = store.milestones["1"]["1"];
    expect(m.raisedAmount).toBe(ONE_ETH.toString());
    expect(m.contributions.length).toBe(2);
  });

  it("updates status on submit/approve", () => {
    onMilestoneCreated(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "MVP", ONE_ETH, ethers.BigNumber.from(0));
    onMilestoneSubmitted(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "QmABC", "");
    expect(store.milestones["1"]["1"].status).toBe("Submitted");
    onMilestoneApproved(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "0xOracle");
    expect(store.milestones["1"]["1"].status).toBe("Approved");
  });

  it("tracks votes", () => {
    onMilestoneCreated(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "MVP", ONE_ETH, ethers.BigNumber.from(0));
    onMilestoneFunded(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "0xBacker1", ONE_ETH);
    onMilestoneVoted(ethers.BigNumber.from(1), ethers.BigNumber.from(1), "0xBacker1", true, ONE_ETH);
    const m = store.milestones["1"]["1"];
    expect(m.votes.length).toBe(1);
    expect(m.votes[0].inFavour).toBe(true);
    expect(m.totalVotesFor).toBe(ONE_ETH.toString());
  });
});

describe("Indexer REST API", () => {
  let app;
  beforeAll(() => { app = buildApi(); });

  it("GET /campaigns returns empty list", async () => {
    const res = await request(app).get("/campaigns");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /campaigns/:id/milestones returns milestones", async () => {
    onCampaignRegistered(ethers.BigNumber.from(2), "0xCreator");
    onMilestoneCreated(ethers.BigNumber.from(2), ethers.BigNumber.from(1), "Beta", ONE_ETH, ethers.BigNumber.from(0));
    const res = await request(app).get("/campaigns/2/milestones");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("Beta");
  });

  it("GET /campaigns/:id/milestones/:mid returns 404 for unknown", async () => {
    const res = await request(app).get("/campaigns/99/milestones/99");
    expect(res.status).toBe(404);
  });
});
