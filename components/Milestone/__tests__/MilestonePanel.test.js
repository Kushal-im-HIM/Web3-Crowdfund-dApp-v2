// components/Milestone/__tests__/MilestonePanel.test.js
// Run: npm test (Next.js project with jest configured)
// Uses React Testing Library + jest mocks for wagmi and ethers.

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Mock wagmi ────────────────────────────────────────────────────────────────
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xBacker" }),
  useContractRead:  jest.fn(),
  useContractWrite: jest.fn(),
}));

// ── Mock IPFS utils ───────────────────────────────────────────────────────────
jest.mock("../../../utils/ipfs", () => ({
  uploadJSONToIPFS: jest.fn().mockResolvedValue({ success: true, hash: "QmMOCK" }),
}));

// ── Mock toast ────────────────────────────────────────────────────────────────
jest.mock("react-hot-toast", () => ({ success: jest.fn(), error: jest.fn() }));

// ── Set env var ───────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS = "0xManager";

const { useContractRead, useContractWrite } = require("wagmi");
const MilestonePanel = require("../MilestonePanel").default;
const MilestoneCreationForm = require("../MilestoneCreationForm").default;

// ── Helpers ───────────────────────────────────────────────────────────────────
const { ethers } = require("ethers");
const makeMilestone = (overrides = {}) => ({
  id: 1n,
  campaignId: 1n,
  title: "MVP",
  description: "Build MVP",
  targetAmount: ethers.utils.parseEther("2"),
  raisedAmount:  ethers.utils.parseEther("1"),
  deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
  status: 0,
  evidenceIpfsHash: "",
  evidenceUrl: "",
  totalVotesFor: 0n,
  totalVotesAgainst: 0n,
  contributorsCount: 1n,
  fundsReleased: false,
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MilestonePanel", () => {
  const mockWrite = jest.fn();

  beforeEach(() => {
    useContractWrite.mockReturnValue({ write: mockWrite, isLoading: false });
    useContractRead.mockImplementation(({ functionName }) => {
      if (functionName === "getCampaignMilestones") return { data: [makeMilestone()], isLoading: false };
      if (functionName === "getContribution") return { data: ethers.utils.parseEther("1") };
      if (functionName === "getVote") return { data: { hasVoted: false, inFavour: false, weight: 0n } };
      return { data: null };
    });
  });

  it("renders milestone title and progress", () => {
    render(<MilestonePanel campaignId={1} creatorAddress="0xCreator" />);
    expect(screen.getByText("MVP")).toBeInTheDocument();
    expect(screen.getByText(/1\.0000 ETH raised/)).toBeInTheDocument();
    expect(screen.getByText(/Target: 2\.0000 ETH/)).toBeInTheDocument();
  });

  it("shows Fund Milestone button for backer on Pending milestone", () => {
    render(<MilestonePanel campaignId={1} creatorAddress="0xCreator" />);
    expect(screen.getByText("Fund Milestone")).toBeInTheDocument();
  });

  it("shows Submit Evidence for creator on Pending milestone", () => {
    // Re-mock account as creator
    require("wagmi").useAccount = () => ({ address: "0xCreator" });
    render(<MilestonePanel campaignId={1} creatorAddress="0xCreator" />);
    expect(screen.getByText("Submit Evidence")).toBeInTheDocument();
  });

  it("shows Approve/Reject vote buttons on Submitted milestone", () => {
    useContractRead.mockImplementation(({ functionName }) => {
      if (functionName === "getCampaignMilestones") return { data: [makeMilestone({ status: 1 })], isLoading: false };
      if (functionName === "getContribution") return { data: ethers.utils.parseEther("1") };
      if (functionName === "getVote") return { data: { hasVoted: false, inFavour: false, weight: 0n } };
      return { data: null };
    });
    require("wagmi").useAccount = () => ({ address: "0xBacker" });
    render(<MilestonePanel campaignId={1} creatorAddress="0xCreator" />);
    expect(screen.getByText("✓ Approve")).toBeInTheDocument();
    expect(screen.getByText("✗ Reject")).toBeInTheDocument();
  });

  it("shows Withdraw button for creator on Approved milestone", () => {
    useContractRead.mockImplementation(({ functionName }) => {
      if (functionName === "getCampaignMilestones") return { data: [makeMilestone({ status: 2, fundsReleased: false })], isLoading: false };
      if (functionName === "getContribution") return { data: 0n };
      if (functionName === "getVote") return { data: { hasVoted: false } };
      return { data: null };
    });
    require("wagmi").useAccount = () => ({ address: "0xCreator" });
    render(<MilestonePanel campaignId={1} creatorAddress="0xCreator" />);
    expect(screen.getByText(/Withdraw/)).toBeInTheDocument();
  });

  it("shows Claim Refund for backer on Rejected milestone", () => {
    useContractRead.mockImplementation(({ functionName }) => {
      if (functionName === "getCampaignMilestones") return { data: [makeMilestone({ status: 3 })], isLoading: false };
      if (functionName === "getContribution") return { data: ethers.utils.parseEther("1") };
      if (functionName === "getVote") return { data: { hasVoted: false } };
      return { data: null };
    });
    require("wagmi").useAccount = () => ({ address: "0xBacker" });
    render(<MilestonePanel campaignId={1} creatorAddress="0xCreator" />);
    expect(screen.getByText(/Claim Refund/)).toBeInTheDocument();
  });

  it("renders nothing when no milestones", () => {
    useContractRead.mockImplementation(() => ({ data: [], isLoading: false }));
    const { container } = render(<MilestonePanel campaignId={1} creatorAddress="0xCreator" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("MilestoneCreationForm", () => {
  const mockRegisterWrite = jest.fn();
  const mockCreateWrite   = jest.fn();

  beforeEach(() => {
    let callCount = 0;
    useContractWrite.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? { write: mockRegisterWrite, isLoading: false }
        : { write: mockCreateWrite,   isLoading: false };
    });
    require("wagmi").useAccount = () => ({ address: "0xCreator" });
  });

  it("renders the enable milestones button", () => {
    render(<MilestoneCreationForm campaignId={1} />);
    expect(screen.getByText(/Enable Milestones/)).toBeInTheDocument();
  });

  it("shows form after clicking enable", () => {
    render(<MilestoneCreationForm campaignId={1} />);
    fireEvent.click(screen.getByText(/Enable Milestones/));
    expect(mockRegisterWrite).toHaveBeenCalledWith({ args: [1] });
    // After state update the form fields should appear
    waitFor(() => expect(screen.getByText("+ Add Milestone")).toBeInTheDocument());
  });
});
