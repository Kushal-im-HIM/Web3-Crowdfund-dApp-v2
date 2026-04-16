// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title Crowdfunding
 *
 * BUG FIXES IN THIS REVISION
 * ───────────────────────────
 * FIX 1 — Withdrawal "Insufficient campaign balance":
 *   ROOT CAUSE: `raisedAmount` was used as BOTH the historical total AND the
 *   live escrow balance. `withdrawMilestoneFunds` decremented it after each
 *   payout, so by the time milestone 2 was ready, `raisedAmount` might differ
 *   from `m.targetAmount` by even 1 wei (fee edge-cases, early-resolve timing),
 *   causing `require(amount <= c.raisedAmount)` to revert.
 *
 *   FIX: `campaignEscrow[_cId]` tracks available ETH per campaign separately.
 *   `raisedAmount` is now immutable after funding — it always equals the
 *   historical total raised, never decremented. All balance checks and
 *   deductions now use `campaignEscrow`.
 *
 * FIX 2 — Voting on an unfunded milestone:
 *   A contributor who funded milestone 1 could vote on milestone 2 even if the
 *   campaign had not raised enough to reach milestone 2's cumulative target.
 *   `voteMilestone` now checks that `raisedAmount >= cumulativeTarget[1..mId]`
 *   before allowing any vote. Since `raisedAmount` is now the immutable total,
 *   this check is always accurate.
 *
 * FIX 3 — `_tryResolveByVote` stake comparison:
 *   Previously used `campaigns[_cId].raisedAmount` (the decremented balance).
 *   Now uses the immutable `raisedAmount` = full campaign stake. Auto-resolve
 *   only fires when ALL original ETH has voted, which is the correct condition.
 */
contract Crowdfunding is ReentrancyGuard, Ownable, Pausable {

    // ─────────────────────────────────────────────────────────────────────────
    // Enums
    // ─────────────────────────────────────────────────────────────────────────

    enum MilestoneStatus {
        Pending,   // 0
        Submitted, // 1
        Approved,  // 2
        Rejected,  // 3
        Released,  // 4
        Refunded   // 5
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────────

    struct Campaign {
        uint256 id;
        address payable creator;
        string title;
        string description;
        string metadataHash;
        uint256 targetAmount;
        uint256 raisedAmount;   // FIX 1: immutable after funding — never decremented
        uint256 deadline;
        bool withdrawn;
        bool active;
        uint256 createdAt;
        uint256 contributorsCount;
    }

    struct Contribution {
        address contributor;
        uint256 amount;
        uint256 timestamp;
    }

    struct Milestone {
        uint256 id;
        uint256 campaignId;
        string title;
        string description;
        uint256 targetAmount;
        uint256 raisedAmount;
        uint256 deadline;
        MilestoneStatus status;
        string evidenceIpfsHash;
        string evidenceUrl;
        uint256 totalVotesFor;
        uint256 totalVotesAgainst;
        uint256 contributorsCount;
        bool fundsReleased;
    }

    struct Vote {
        bool hasVoted;
        bool inFavour;
        uint256 weight;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public constant CAMPAIGN_CREATION_FEE = 0.0001 ether;
    uint256 public constant MAX_MILESTONES_PER_CAMPAIGN = 5;

    // ─────────────────────────────────────────────────────────────────────────
    // Campaign state
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public campaignCounter;
    uint256 public totalFeesCollected;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => Contribution[]) public campaignContributions;
    mapping(address => uint256[]) public userCampaigns;
    mapping(address => uint256[]) public userContributions;

    /**
     * FIX 1: campaignEscrow tracks available (withdrawable) ETH per campaign.
     * Increases on contribution, decreases on milestone withdrawal or refund.
     * raisedAmount is NEVER touched after being set — it's the historical total.
     */
    mapping(uint256 => uint256) public campaignEscrow;

    // ─────────────────────────────────────────────────────────────────────────
    // Milestone state
    // ─────────────────────────────────────────────────────────────────────────

    address public oracleAddress;

    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(uint256 => uint256) public milestoneCount;
    mapping(uint256 => bool) public milestoneEnabled;
    mapping(uint256 => uint256) public totalMilestoneTarget;
    mapping(uint256 => mapping(uint256 => mapping(address => Vote))) public votes;

    // ─────────────────────────────────────────────────────────────────────────
    // Voting parameters
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public votingQuorumBps = 3000;
    uint256 public approvalThresholdBps = 5100;
    uint256 public votingWindowSeconds = 7 days;

    // ─────────────────────────────────────────────────────────────────────────
    // Events — Campaign
    // ─────────────────────────────────────────────────────────────────────────

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 targetAmount, uint256 deadline, string metadataHash);
    event ContributionMade(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event CampaignFunded(uint256 indexed campaignId, uint256 totalRaised);
    event RefundIssued(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event CampaignWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amount);
    event FeesWithdrawn(address indexed admin, uint256 amount);
    event CommissionUpdated(uint256 oldCommission, uint256 newCommission);

    // ─────────────────────────────────────────────────────────────────────────
    // Events — Milestone
    // ─────────────────────────────────────────────────────────────────────────

    event MilestonesEnabled(uint256 indexed campaignId, address indexed creator);
    event MilestoneCreated(uint256 indexed campaignId, uint256 indexed milestoneId, string title, uint256 targetAmount, uint256 deadline);
    event MilestoneSubmitted(uint256 indexed campaignId, uint256 indexed milestoneId, string evidenceIpfsHash, string evidenceUrl);
    event MilestoneApproved(uint256 indexed campaignId, uint256 indexed milestoneId, address approver);
    event MilestoneRejected(uint256 indexed campaignId, uint256 indexed milestoneId, address rejecter);
    event MilestoneReleased(uint256 indexed campaignId, uint256 indexed milestoneId, uint256 amount);
    event MilestoneVoted(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed voter, bool inFavour, uint256 weight);
    event OracleAddressUpdated(address indexed oldOracle, address indexed newOracle);
    event VotingParamsUpdated(uint256 quorumBps, uint256 thresholdBps, uint256 windowSeconds);

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier validCampaign(uint256 _id) {
        require(_id > 0 && _id <= campaignCounter, "Invalid campaign ID");
        require(campaigns[_id].active, "Campaign not active");
        _;
    }
    modifier onlyCampaignCreator(uint256 _id) {
        require(campaigns[_id].creator == msg.sender, "Not campaign creator");
        _;
    }
    modifier campaignNotEnded(uint256 _id) {
        require(block.timestamp < campaigns[_id].deadline, "Campaign has ended");
        _;
    }
    modifier campaignEnded(uint256 _id) {
        require(block.timestamp >= campaigns[_id].deadline, "Campaign still active");
        _;
    }
    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Not oracle");
        _;
    }
    modifier validMilestone(uint256 _cId, uint256 _mId) {
        require(_mId > 0 && _mId <= milestoneCount[_cId], "Invalid milestone");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _oracle) {
        require(_oracle != address(0), "Oracle cannot be zero address");
        oracleAddress = _oracle;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setOracleAddress(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Zero address");
        emit OracleAddressUpdated(oracleAddress, _newOracle);
        oracleAddress = _newOracle;
    }

    function setVotingParams(uint256 _quorumBps, uint256 _thresholdBps, uint256 _windowSeconds) external onlyOwner {
        require(_quorumBps <= 10000, "Quorum > 100%");
        require(_thresholdBps <= 10000, "Threshold > 100%");
        require(_windowSeconds >= 1 days, "Window too short");
        votingQuorumBps = _quorumBps;
        approvalThresholdBps = _thresholdBps;
        votingWindowSeconds = _windowSeconds;
        emit VotingParamsUpdated(_quorumBps, _thresholdBps, _windowSeconds);
    }

    function deactivateCampaign(uint256 _id) external onlyOwner {
        require(_id > 0 && _id <= campaignCounter, "Invalid ID");
        campaigns[_id].active = false;
    }

    function reactivateCampaign(uint256 _id) external onlyOwner {
        require(_id > 0 && _id <= campaignCounter, "Invalid ID");
        require(block.timestamp < campaigns[_id].deadline, "Campaign expired");
        campaigns[_id].active = true;
    }

    function withdrawFees(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount <= totalFeesCollected, "Insufficient fee balance");
        require(_amount <= address(this).balance, "Insufficient contract balance");
        totalFeesCollected -= _amount;
        payable(owner()).transfer(_amount);
        emit FeesWithdrawn(msg.sender, _amount);
    }

    function emergencyRefund(uint256 _cId, address _contributor) external onlyOwner nonReentrant {
        require(contributions[_cId][_contributor] > 0, "No contribution");
        uint256 amt = contributions[_cId][_contributor];
        contributions[_cId][_contributor] = 0;
        // FIX 1: deduct from escrow, not raisedAmount
        if (campaignEscrow[_cId] >= amt) {
            campaignEscrow[_cId] -= amt;
        }
        payable(_contributor).transfer(amt);
        emit RefundIssued(_cId, _contributor, amt);
    }

    function emergencyWithdraw() external onlyOwner nonReentrant {
        payable(owner()).transfer(address(this).balance);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─────────────────────────────────────────────────────────────────────────
    // Campaign — Write
    // ─────────────────────────────────────────────────────────────────────────

    function createCampaign(
        string memory _title,
        string memory _description,
        string memory _metadataHash,
        uint256 _targetAmount,
        uint256 _duration
    ) external payable whenNotPaused nonReentrant {
        require(msg.value >= CAMPAIGN_CREATION_FEE, "Insufficient creation fee");
        require(_targetAmount > 0, "Target must be > 0");
        require(_duration > 0, "Duration must be > 0");
        require(bytes(_title).length > 0, "Empty title");
        require(bytes(_metadataHash).length > 0, "Empty metadata hash");

        campaignCounter++;
        uint256 deadline = block.timestamp + _duration;

        campaigns[campaignCounter] = Campaign({
            id: campaignCounter,
            creator: payable(msg.sender),
            title: _title,
            description: _description,
            metadataHash: _metadataHash,
            targetAmount: _targetAmount,
            raisedAmount: 0,
            deadline: deadline,
            withdrawn: false,
            active: true,
            createdAt: block.timestamp,
            contributorsCount: 0
        });

        userCampaigns[msg.sender].push(campaignCounter);
        totalFeesCollected += CAMPAIGN_CREATION_FEE;

        if (msg.value > CAMPAIGN_CREATION_FEE) {
            payable(msg.sender).transfer(msg.value - CAMPAIGN_CREATION_FEE);
        }

        emit CampaignCreated(campaignCounter, msg.sender, _targetAmount, deadline, _metadataHash);
    }

    function contributeToCampaign(
        uint256 _cId
    ) external payable validCampaign(_cId) campaignNotEnded(_cId) whenNotPaused nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(campaigns[_cId].creator != msg.sender, "Creator cannot contribute");
        require(
            campaigns[_cId].raisedAmount < campaigns[_cId].targetAmount,
            "Hard cap reached: campaign is fully funded"
        );

        Campaign storage c = campaigns[_cId];
        uint256 remaining = c.targetAmount - c.raisedAmount;
        uint256 accepted = msg.value > remaining ? remaining : msg.value;
        uint256 refund   = msg.value - accepted;

        if (contributions[_cId][msg.sender] == 0) {
            c.contributorsCount++;
            userContributions[msg.sender].push(_cId);
        }

        contributions[_cId][msg.sender] += accepted;
        c.raisedAmount += accepted;
        // FIX 1: also track in escrow
        campaignEscrow[_cId] += accepted;

        campaignContributions[_cId].push(Contribution(msg.sender, accepted, block.timestamp));

        if (refund > 0) payable(msg.sender).transfer(refund);

        emit ContributionMade(_cId, msg.sender, accepted);
        if (c.raisedAmount >= c.targetAmount) {
            emit CampaignFunded(_cId, c.raisedAmount);
        }
    }

    function withdrawCampaignFunds(uint256 _cId) external validCampaign(_cId) onlyCampaignCreator(_cId) nonReentrant {
        Campaign storage c = campaigns[_cId];
        require(!c.withdrawn, "Already withdrawn");
        require(c.raisedAmount >= c.targetAmount, "Target not reached");
        require(
            !milestoneEnabled[_cId],
            "Milestone campaign: use withdrawMilestoneFunds() per approved milestone"
        );
        c.withdrawn = true;
        // FIX 1: use escrow for transfer
        uint256 amount = campaignEscrow[_cId];
        campaignEscrow[_cId] = 0;
        c.creator.transfer(amount);
        emit CampaignWithdrawn(_cId, msg.sender, amount);
    }

    function getRefund(uint256 _cId) external validCampaign(_cId) campaignEnded(_cId) nonReentrant {
        Campaign storage c = campaigns[_cId];
        require(c.raisedAmount < c.targetAmount, "Campaign was successful");
        require(contributions[_cId][msg.sender] > 0, "No contribution");
        uint256 amt = contributions[_cId][msg.sender];
        contributions[_cId][msg.sender] = 0;
        // FIX 1: deduct from escrow
        if (campaignEscrow[_cId] >= amt) {
            campaignEscrow[_cId] -= amt;
        }
        payable(msg.sender).transfer(amt);
        emit RefundIssued(_cId, msg.sender, amt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Milestone — Setup
    // ─────────────────────────────────────────────────────────────────────────

    function registerCampaign(uint256 _cId) external onlyCampaignCreator(_cId) {
        require(!milestoneEnabled[_cId], "Milestones already enabled");
        milestoneEnabled[_cId] = true;
        emit MilestonesEnabled(_cId, msg.sender);
    }

    function createMilestone(
        uint256 _cId,
        string calldata _title,
        string calldata _description,
        uint256 _targetAmount,
        uint256 _duration
    ) external onlyCampaignCreator(_cId) {
        require(milestoneEnabled[_cId], "Milestones not enabled");
        require(_targetAmount > 0, "Target must be > 0");
        require(_duration > 0, "Duration must be > 0");
        require(bytes(_title).length > 0, "Empty title");
        require(milestoneCount[_cId] < MAX_MILESTONES_PER_CAMPAIGN, "Max milestones reached");

        uint256 newTotal = totalMilestoneTarget[_cId] + _targetAmount;
        require(newTotal <= campaigns[_cId].targetAmount, "Milestone targets exceed campaign goal");
        totalMilestoneTarget[_cId] = newTotal;

        milestoneCount[_cId]++;
        uint256 mid = milestoneCount[_cId];

        milestones[_cId][mid] = Milestone({
            id: mid,
            campaignId: _cId,
            title: _title,
            description: _description,
            targetAmount: _targetAmount,
            raisedAmount: 0,
            deadline: block.timestamp + _duration,
            status: MilestoneStatus.Pending,
            evidenceIpfsHash: "",
            evidenceUrl: "",
            totalVotesFor: 0,
            totalVotesAgainst: 0,
            contributorsCount: 0,
            fundsReleased: false
        });

        emit MilestoneCreated(_cId, mid, _title, _targetAmount, block.timestamp + _duration);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Milestone — Evidence & Oracle
    // ─────────────────────────────────────────────────────────────────────────

    function submitMilestoneEvidence(
        uint256 _cId, uint256 _mId,
        string calldata _ipfsHash, string calldata _url
    ) external onlyCampaignCreator(_cId) validMilestone(_cId, _mId) {
        Milestone storage m = milestones[_cId][_mId];
        require(m.status == MilestoneStatus.Pending, "Already submitted or resolved");
        require(bytes(_ipfsHash).length > 0 || bytes(_url).length > 0, "Must provide evidence");
        m.status = MilestoneStatus.Submitted;
        m.evidenceIpfsHash = _ipfsHash;
        m.evidenceUrl = _url;
        emit MilestoneSubmitted(_cId, _mId, _ipfsHash, _url);
    }

    function approveMilestoneByOracle(uint256 _cId, uint256 _mId) external onlyOracle validMilestone(_cId, _mId) {
        Milestone storage m = milestones[_cId][_mId];
        require(m.status == MilestoneStatus.Submitted, "Not in Submitted state");
        m.status = MilestoneStatus.Approved;
        emit MilestoneApproved(_cId, _mId, msg.sender);
    }

    function rejectMilestoneByOracle(uint256 _cId, uint256 _mId) external onlyOracle validMilestone(_cId, _mId) {
        Milestone storage m = milestones[_cId][_mId];
        require(m.status == MilestoneStatus.Submitted, "Not in Submitted state");
        m.status = MilestoneStatus.Rejected;
        emit MilestoneRejected(_cId, _mId, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Milestone — DAO Voting
    // ─────────────────────────────────────────────────────────────────────────

    function voteMilestone(
        uint256 _cId, uint256 _mId, bool _inFavour
    ) external validMilestone(_cId, _mId) {
        Milestone storage m = milestones[_cId][_mId];

        require(
            m.status == MilestoneStatus.Submitted,
            m.status == MilestoneStatus.Approved
                ? "Milestone already approved - result is final"
                : m.status == MilestoneStatus.Rejected
                    ? "Milestone already rejected - claim your refund"
                    : m.status == MilestoneStatus.Pending
                        ? "Evidence not yet submitted - voting not started"
                        : "Voting not open"
        );

        require(
            block.timestamp < m.deadline + votingWindowSeconds,
            "Voting window has closed - call finalizeVoting() to settle"
        );

        // FIX 2: voter must have contributed AND the campaign must have raised
        // enough to reach this milestone's cumulative target.
        // This prevents contributors who only funded milestone 1 from voting
        // on milestone 2 before it has received any campaign allocation.
        uint256 weight = contributions[_cId][msg.sender];
        require(weight > 0, "Only contributors can vote");

        uint256 cumulativeTarget = 0;
        for (uint256 i = 1; i <= _mId; i++) {
            cumulativeTarget += milestones[_cId][i].targetAmount;
        }
        require(
            campaigns[_cId].raisedAmount >= cumulativeTarget,
            "This milestone has not received enough campaign funding yet"
        );

        Vote storage v = votes[_cId][_mId][msg.sender];
        require(!v.hasVoted, "You have already voted on this milestone");

        v.hasVoted = true;
        v.inFavour = _inFavour;
        v.weight = weight;

        if (_inFavour) { m.totalVotesFor += weight; }
        else           { m.totalVotesAgainst += weight; }

        emit MilestoneVoted(_cId, _mId, msg.sender, _inFavour, weight);
        _tryResolveByVote(_cId, _mId);
    }

    function finalizeVoting(uint256 _cId, uint256 _mId) external validMilestone(_cId, _mId) {
        Milestone storage m = milestones[_cId][_mId];
        require(m.status == MilestoneStatus.Submitted, "Not in Submitted state");
        require(block.timestamp >= m.deadline + votingWindowSeconds, "Voting window still open");
        _resolveByVote(_cId, _mId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Milestone — Fund Release
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * FIX 1: Use campaignEscrow instead of c.raisedAmount for balance check.
     * raisedAmount is never decremented, so it always equals the historical
     * total raised. campaignEscrow starts equal to raisedAmount and decrements
     * with each withdrawal, accurately tracking available funds.
     */
    function withdrawMilestoneFunds(
        uint256 _cId, uint256 _mId
    ) external onlyCampaignCreator(_cId) validMilestone(_cId, _mId) nonReentrant {
        Milestone storage m = milestones[_cId][_mId];
        require(!m.fundsReleased, "Already released");
        require(
            m.status == MilestoneStatus.Approved,
            "Milestone not approved by Oracle or DAO - cannot withdraw"
        );

        Campaign storage c = campaigns[_cId];
        uint256 amount = m.targetAmount;

        // FIX 1: check escrow balance, not raisedAmount
        require(
            amount <= campaignEscrow[_cId],
            "Insufficient escrow balance - check previous withdrawals"
        );

        m.fundsReleased = true;
        m.status = MilestoneStatus.Released;
        // FIX 1: deduct from escrow only, never touch raisedAmount
        campaignEscrow[_cId] -= amount;

        payable(c.creator).transfer(amount);
        emit MilestoneReleased(_cId, _mId, amount);
    }

    function claimMilestoneRefund(uint256 _cId, uint256 _mId) external validMilestone(_cId, _mId) nonReentrant {
        Milestone storage m = milestones[_cId][_mId];
        require(
            m.status == MilestoneStatus.Rejected || m.status == MilestoneStatus.Refunded,
            "Not refundable"
        );

        uint256 contributed = contributions[_cId][msg.sender];
        require(contributed > 0, "Nothing to refund");

        uint256 totalStake = campaigns[_cId].targetAmount;
        uint256 refundAmt = totalStake > 0
            ? (contributed * m.targetAmount) / totalStake
            : 0;
        require(refundAmt > 0, "Refund too small");

        contributions[_cId][msg.sender] = 0;
        if (m.status == MilestoneStatus.Rejected) m.status = MilestoneStatus.Refunded;

        // FIX 1: deduct from escrow, not raisedAmount
        if (campaignEscrow[_cId] >= refundAmt) {
            campaignEscrow[_cId] -= refundAmt;
        }
        payable(msg.sender).transfer(refundAmt);
        emit MilestoneReleased(_cId, _mId, refundAmt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * FIX 3: Use raisedAmount (immutable historical total) as totalStake.
     * Previously compared against the decremented escrow balance, causing
     * early resolution after milestone 1 withdrawal (0.66 ETH stake instead
     * of the true 1.36 ETH). Now correctly waits for 100% of original stakers.
     */
    function _tryResolveByVote(uint256 _cId, uint256 _mId) internal {
        Milestone storage m = milestones[_cId][_mId];
        uint256 totalVotes = m.totalVotesFor + m.totalVotesAgainst;
        if (totalVotes == 0) return;

        // FIX 3: use raisedAmount (historical total, never decremented)
        uint256 totalStake = campaigns[_cId].raisedAmount;
        if (totalStake == 0) return;

        // Only auto-resolve when 100% of original stakers have voted.
        if (totalVotes < totalStake) return;

        _resolveByVote(_cId, _mId);
    }

    function _resolveByVote(uint256 _cId, uint256 _mId) internal {
        Milestone storage m = milestones[_cId][_mId];
        if (m.status != MilestoneStatus.Submitted) return;

        uint256 totalVotes = m.totalVotesFor + m.totalVotesAgainst;
        bool approved = totalVotes > 0 &&
            m.totalVotesFor * 10000 >= totalVotes * approvalThresholdBps;

        if (approved) {
            m.status = MilestoneStatus.Approved;
            emit MilestoneApproved(_cId, _mId, address(0));
        } else {
            m.status = MilestoneStatus.Rejected;
            emit MilestoneRejected(_cId, _mId, address(0));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Campaign
    // ─────────────────────────────────────────────────────────────────────────

    function getCampaign(uint256 _id) external view returns (Campaign memory) {
        require(_id > 0 && _id <= campaignCounter, "Invalid ID");
        return campaigns[_id];
    }

    function getContribution(uint256 _cId, address _contributor) external view returns (uint256) {
        return contributions[_cId][_contributor];
    }

    function getCampaignContributions(uint256 _cId) external view returns (Contribution[] memory) {
        return campaignContributions[_cId];
    }

    function getUserCampaigns(address _user) external view returns (uint256[] memory) {
        return userCampaigns[_user];
    }

    function getUserContributions(address _user) external view returns (uint256[] memory) {
        return userContributions[_user];
    }

    function isCampaignSuccessful(uint256 _id) external view returns (bool) {
        require(_id > 0 && _id <= campaignCounter, "Invalid ID");
        return campaigns[_id].raisedAmount >= campaigns[_id].targetAmount;
    }

    function getCampaignStats(uint256 _id) external view returns (
        uint256 raisedAmount, uint256 targetAmount, uint256 contributorsCount,
        uint256 timeLeft, bool isActive, bool isSuccessful
    ) {
        require(_id > 0 && _id <= campaignCounter, "Invalid ID");
        Campaign memory c = campaigns[_id];
        raisedAmount = c.raisedAmount;
        targetAmount = c.targetAmount;
        contributorsCount = c.contributorsCount;
        timeLeft = block.timestamp >= c.deadline ? 0 : c.deadline - block.timestamp;
        isActive = c.active;
        isSuccessful = c.raisedAmount >= c.targetAmount;
    }

    function getContractStats() external view returns (
        uint256 totalCampaigns, uint256 totalFees, uint256 contractBalance
    ) {
        totalCampaigns = campaignCounter;
        totalFees = totalFeesCollected;
        contractBalance = address(this).balance;
    }

    function getActiveCampaigns(uint256 _offset, uint256 _limit) external view returns (Campaign[] memory) {
        require(_limit > 0 && _limit <= 100, "Invalid limit");
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= campaignCounter; i++) {
            if (campaigns[i].active) activeCount++;
        }
        if (_offset >= activeCount) return new Campaign[](0);

        uint256 returnCount = (_offset + _limit > activeCount) ? activeCount - _offset : _limit;
        Campaign[] memory result = new Campaign[](returnCount);
        uint256 resultIdx = 0;
        uint256 currentIdx = 0;

        for (uint256 i = 1; i <= campaignCounter && resultIdx < returnCount; i++) {
            if (campaigns[i].active) {
                if (currentIdx >= _offset) { result[resultIdx++] = campaigns[i]; }
                currentIdx++;
            }
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View — Milestone
    // ─────────────────────────────────────────────────────────────────────────

    function isCampaignRegistered(uint256 _cId) external view returns (bool) {
        return milestoneEnabled[_cId];
    }

    function getMilestone(uint256 _cId, uint256 _mId) external view validMilestone(_cId, _mId) returns (Milestone memory) {
        return milestones[_cId][_mId];
    }

    function getCampaignMilestones(uint256 _cId) external view returns (Milestone[] memory) {
        uint256 count = milestoneCount[_cId];
        Milestone[] memory result = new Milestone[](count);
        for (uint256 i = 1; i <= count; i++) {
            result[i - 1] = milestones[_cId][i];
        }
        return result;
    }

    function getVote(uint256 _cId, uint256 _mId, address _voter) external view returns (Vote memory) {
        return votes[_cId][_mId][_voter];
    }

    /**
     * @dev Returns the available escrow balance for a campaign.
     * Useful for frontend to show withdrawable amounts.
     */
    function getCampaignEscrow(uint256 _cId) external view returns (uint256) {
        return campaignEscrow[_cId];
    }

    receive() external payable {}
}
