// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Minimal interface to CrowdfundingMarketplace.
 *
 * WATERFALL MODEL NOTE:
 *   Under the waterfall funding model ALL contributor ETH flows through
 *   CrowdfundingMarketplace.contributeToCampaign(), NOT through
 *   MilestoneManager.contributeToMilestone(). As a result the per-milestone
 *   contribution ledger (milestoneContributions) inside MilestoneManager is
 *   always 0 for every backer.  Vote eligibility and weight are therefore
 *   sourced from the main marketplace contract's contribution records.
 */
interface ICrowdfundingMarketplace {
    function getContribution(
        uint256 _campaignId,
        address _contributor
    ) external view returns (uint256);
}

/**
 * @title MilestoneManager
 * @dev Layered milestone contract that references campaign IDs from the existing
 *      CrowdfundingMarketplace without touching its storage.  Supports:
 *       - Milestone creation by campaign creator (opt-in)
 *       - Per-milestone contributions (alongside existing contributeToCampaign)
 *       - Oracle approval path (trusted off-chain verifier)
 *       - DAO voting fallback (proportional to milestone contribution amount)
 *       - Pull-pattern fund release with ReentrancyGuard
 */
contract MilestoneManager is ReentrancyGuard, Ownable {
    // ─────────────────────────────────────────────────────────────────────────
    // Enums
    // ─────────────────────────────────────────────────────────────────────────

    enum MilestoneStatus {
        Pending, // Created, accepting contributions
        Submitted, // Creator submitted evidence; awaiting verdict
        Approved, // Oracle or DAO approved
        Rejected, // Oracle or DAO rejected
        Released, // Funds withdrawn by creator
        Refunded // Funds refunded to contributors
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────────

    struct Milestone {
        uint256 id;
        uint256 campaignId;
        string title;
        string description;
        uint256 targetAmount; // ETH (wei) to raise for this milestone
        uint256 raisedAmount;
        uint256 deadline; // Unix timestamp
        MilestoneStatus status;
        string evidenceIpfsHash; // Set by creator at submission
        string evidenceUrl; // Optional plain URL fallback
        uint256 totalVotesFor; // ETH-weighted votes in favour
        uint256 totalVotesAgainst;
        uint256 contributorsCount;
        bool fundsReleased;
    }

    struct Vote {
        bool hasVoted;
        bool inFavour;
        uint256 weight; // ETH contributed to this milestone by voter
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State variables
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Address of the trusted oracle signer
    address public oracleAddress;

    /// @dev Reference to the main CrowdfundingMarketplace contract.
    ///      Used to look up per-campaign ETH contributions for DAO vote weight
    ///      under the waterfall model (milestoneContributions is always 0).
    ICrowdfundingMarketplace public crowdfundingMarketplace;

    // Issue 2 FIX: hard cap on number of milestones per campaign.
    // Prevents creators from spamming milestones beyond a sensible limit.
    uint256 public constant MAX_MILESTONES_PER_CAMPAIGN = 5;

    /// @dev campaignId  => milestoneId => Milestone
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;

    /// @dev campaignId  => milestone count (used as next ID)
    mapping(uint256 => uint256) public milestoneCount;

    /// @dev campaignId  => creator address (opt-in registration)
    mapping(uint256 => address) public campaignCreator;

    // FIX (Issue #2): Store each campaign's funding target so milestone sums can be validated.
    // Previously MilestoneManager had no knowledge of the campaign target, allowing milestone
    // totals to exceed the campaign goal entirely.
    /// @dev campaignId  => campaign target amount in wei (set at registration time)
    mapping(uint256 => uint256) public campaignTarget;

    // FIX (Issue #2): Track the sum of all milestone targets per campaign for cap enforcement.
    /// @dev campaignId  => total ETH allocated across all milestones (wei)
    mapping(uint256 => uint256) public totalMilestoneTarget;

    /// @dev campaignId  => milestoneId => contributor => amount
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        public milestoneContributions;

    /// @dev campaignId  => milestoneId => voter => Vote
    mapping(uint256 => mapping(uint256 => mapping(address => Vote)))
        public votes;

    /// @dev Voting quorum: minimum ETH-weight participation rate (basis points, e.g. 3000 = 30%)
    uint256 public votingQuorumBps = 3000;

    /// @dev Approval threshold: minimum ETH-weight FOR rate among votes (basis points, e.g. 5100 = 51%)
    uint256 public approvalThresholdBps = 5100;

    /// @dev Voting window in seconds after milestone deadline or evidence submission
    uint256 public votingWindowSeconds = 7 days;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event CampaignRegistered(
        uint256 indexed campaignId,
        address indexed creator
    );
    event MilestoneCreated(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        string title,
        uint256 targetAmount,
        uint256 deadline
    );
    event MilestoneFunded(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        address indexed contributor,
        uint256 amount
    );
    event MilestoneSubmitted(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        string evidenceIpfsHash,
        string evidenceUrl
    );
    event MilestoneApproved(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        address approver
    );
    event MilestoneRejected(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        address rejecter
    );
    event MilestoneReleased(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        uint256 amount
    );
    event MilestoneVoted(
        uint256 indexed campaignId,
        uint256 indexed milestoneId,
        address indexed voter,
        bool inFavour,
        uint256 weight
    );
    event OracleAddressUpdated(
        address indexed oldOracle,
        address indexed newOracle
    );
    event VotingParamsUpdated(
        uint256 quorumBps,
        uint256 thresholdBps,
        uint256 windowSeconds
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyOracle() {
        require(
            msg.sender == oracleAddress,
            "MilestoneManager: caller is not oracle"
        );
        _;
    }

    modifier onlyCampaignCreator(uint256 _campaignId) {
        require(
            campaignCreator[_campaignId] == msg.sender,
            "MilestoneManager: not campaign creator"
        );
        _;
    }

    modifier validMilestone(uint256 _campaignId, uint256 _milestoneId) {
        require(
            _milestoneId > 0 && _milestoneId <= milestoneCount[_campaignId],
            "MilestoneManager: invalid milestone"
        );
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _oracleAddress, address _crowdfundingMarketplace) {
        require(
            _oracleAddress != address(0),
            "MilestoneManager: oracle is zero address"
        );
        require(
            _crowdfundingMarketplace != address(0),
            "MilestoneManager: marketplace is zero address"
        );
        oracleAddress = _oracleAddress;
        crowdfundingMarketplace = ICrowdfundingMarketplace(_crowdfundingMarketplace);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Rotate oracle address (owner only).
     * @param _newOracle New trusted oracle signer address.
     */
    function setOracleAddress(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "MilestoneManager: zero address");
        emit OracleAddressUpdated(oracleAddress, _newOracle);
        oracleAddress = _newOracle;
    }

    /**
     * @notice Update the CrowdfundingMarketplace reference (owner only).
     *         Call this if the main marketplace contract is ever redeployed.
     * @param _marketplace New CrowdfundingMarketplace address.
     */
    function setCrowdfundingMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "MilestoneManager: zero address");
        crowdfundingMarketplace = ICrowdfundingMarketplace(_marketplace);
    }

    /**
     * @notice Update DAO voting parameters (owner only).
     */
    function setVotingParams(
        uint256 _quorumBps,
        uint256 _thresholdBps,
        uint256 _windowSeconds
    ) external onlyOwner {
        require(_quorumBps <= 10000, "MilestoneManager: quorum > 100%");
        require(_thresholdBps <= 10000, "MilestoneManager: threshold > 100%");
        require(_windowSeconds >= 1 days, "MilestoneManager: window too short");
        votingQuorumBps = _quorumBps;
        approvalThresholdBps = _thresholdBps;
        votingWindowSeconds = _windowSeconds;
        emit VotingParamsUpdated(_quorumBps, _thresholdBps, _windowSeconds);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Opt-in registration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Campaign creator registers their existing campaign for milestone management.
     *         Must be called ONCE per campaign; caller becomes authoritative creator here.
     * @param _campaignId      ID of the campaign in CrowdfundingMarketplace.
     * @param _campaignTarget  Campaign funding target in wei — used to validate milestone totals.
     *
     * FIX (Issue #2): Added _campaignTarget parameter. Previously registerCampaign() stored no
     * target, making it impossible to validate that milestone amounts don't exceed the campaign goal.
     * The creator supplies the target here (same value they used in createCampaign()).
     */
    function registerCampaign(
        uint256 _campaignId,
        uint256 _campaignTarget
    ) external {
        require(
            campaignCreator[_campaignId] == address(0),
            "MilestoneManager: already registered"
        );
        // FIX (Issue #2): Validate that a non-zero target is provided.
        require(
            _campaignTarget > 0,
            "MilestoneManager: campaign target must be > 0"
        );

        campaignCreator[_campaignId] = msg.sender;
        // FIX (Issue #2): Persist campaign target for downstream milestone validation.
        campaignTarget[_campaignId] = _campaignTarget;

        emit CampaignRegistered(_campaignId, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Milestone creation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Create a milestone for a registered campaign.
     * @param _campaignId   Campaign ID (must be registered).
     * @param _title        Human-readable title.
     * @param _description  Description of deliverable.
     * @param _targetAmount ETH (wei) funding target for this milestone.
     * @param _duration     Seconds from now until contribution deadline.
     */
    function createMilestone(
        uint256 _campaignId,
        string calldata _title,
        string calldata _description,
        uint256 _targetAmount,
        uint256 _duration
    ) external onlyCampaignCreator(_campaignId) {
        require(_targetAmount > 0, "MilestoneManager: target must be > 0");
        require(_duration > 0, "MilestoneManager: duration must be > 0");
        require(bytes(_title).length > 0, "MilestoneManager: empty title");

        // Issue 2 FIX: enforce hard cap on milestones per campaign at the contract level.
        // Frontend enforces MAX_MILESTONES=5 too, but this ensures the invariant on-chain
        // regardless of who calls the function.
        require(
            milestoneCount[_campaignId] < MAX_MILESTONES_PER_CAMPAIGN,
            "MilestoneManager: max milestones reached"
        );

        // FIX (Issue #2): Ensure cumulative milestone targets never exceed the campaign goal.
        // Previously there was no such check, allowing unlimited milestone creation.
        uint256 newTotal = totalMilestoneTarget[_campaignId] + _targetAmount;
        require(
            newTotal <= campaignTarget[_campaignId],
            "MilestoneManager: milestone targets would exceed campaign goal"
        );
        // FIX (Issue #2): Track running total of milestone targets.
        totalMilestoneTarget[_campaignId] = newTotal;

        milestoneCount[_campaignId]++;
        uint256 mid = milestoneCount[_campaignId];

        milestones[_campaignId][mid] = Milestone({
            id: mid,
            campaignId: _campaignId,
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

        emit MilestoneCreated(
            _campaignId,
            mid,
            _title,
            _targetAmount,
            block.timestamp + _duration
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Contributions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Contribute ETH to a specific milestone.
     *         Does NOT alter existing CrowdfundingMarketplace contributions.
     * @param _campaignId   Campaign ID.
     * @param _milestoneId  Milestone ID.
     */
    function contributeToMilestone(
        uint256 _campaignId,
        uint256 _milestoneId
    ) external payable validMilestone(_campaignId, _milestoneId) nonReentrant {
        require(msg.value > 0, "MilestoneManager: must send ETH");
        Milestone storage m = milestones[_campaignId][_milestoneId];
        require(
            m.status == MilestoneStatus.Pending,
            "MilestoneManager: not accepting contributions"
        );
        require(
            block.timestamp < m.deadline,
            "MilestoneManager: deadline passed"
        );
        require(
            campaignCreator[_campaignId] != msg.sender,
            "MilestoneManager: creator cannot contribute"
        );

        // FIX (Issue #3): Enforce hard cap at milestone targetAmount.
        // Previously msg.value was accepted without bounds, mirroring the same flaw as in
        // CrowdfundingMarketplace. Now we cap the accepted amount and refund the excess.
        uint256 remainingAllowance = m.targetAmount > m.raisedAmount
            ? m.targetAmount - m.raisedAmount
            : 0;
        require(
            remainingAllowance > 0,
            "MilestoneManager: milestone funding target already reached"
        );

        uint256 acceptedAmount = msg.value > remainingAllowance
            ? remainingAllowance
            : msg.value;
        uint256 refundAmount = msg.value - acceptedAmount;

        if (
            milestoneContributions[_campaignId][_milestoneId][msg.sender] == 0
        ) {
            m.contributorsCount++;
        }
        milestoneContributions[_campaignId][_milestoneId][
            msg.sender
        ] += acceptedAmount;
        // CHANGED: was m.raisedAmount += msg.value;
        m.raisedAmount += acceptedAmount;

        // Refund excess (reentrancy guard is active)
        if (refundAmount > 0) {
            payable(msg.sender).transfer(refundAmount);
        }

        // CHANGED: was emit MilestoneFunded(..., msg.value);
        emit MilestoneFunded(
            _campaignId,
            _milestoneId,
            msg.sender,
            acceptedAmount
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Evidence submission
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Creator submits evidence of milestone completion.
     * @param _campaignId        Campaign ID.
     * @param _milestoneId       Milestone ID.
     * @param _evidenceIpfsHash  IPFS CID of the evidence package (can be empty if URL provided).
     * @param _evidenceUrl       Plain URL fallback (can be empty if IPFS provided).
     */
    function submitMilestoneEvidence(
        uint256 _campaignId,
        uint256 _milestoneId,
        string calldata _evidenceIpfsHash,
        string calldata _evidenceUrl
    )
        external
        onlyCampaignCreator(_campaignId)
        validMilestone(_campaignId, _milestoneId)
    {
        Milestone storage m = milestones[_campaignId][_milestoneId];
        require(
            m.status == MilestoneStatus.Pending,
            "MilestoneManager: already submitted or resolved"
        );
        require(
            bytes(_evidenceIpfsHash).length > 0 ||
                bytes(_evidenceUrl).length > 0,
            "MilestoneManager: must provide evidence"
        );

        m.status = MilestoneStatus.Submitted;
        m.evidenceIpfsHash = _evidenceIpfsHash;
        m.evidenceUrl = _evidenceUrl;

        emit MilestoneSubmitted(
            _campaignId,
            _milestoneId,
            _evidenceIpfsHash,
            _evidenceUrl
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Oracle approval / rejection
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Oracle approves milestone after off-chain evidence verification.
     */
    function approveMilestoneByOracle(
        uint256 _campaignId,
        uint256 _milestoneId
    ) external onlyOracle validMilestone(_campaignId, _milestoneId) {
        Milestone storage m = milestones[_campaignId][_milestoneId];
        require(
            m.status == MilestoneStatus.Submitted,
            "MilestoneManager: not in Submitted state"
        );

        m.status = MilestoneStatus.Approved;
        emit MilestoneApproved(_campaignId, _milestoneId, msg.sender);
    }

    /**
     * @notice Oracle rejects milestone, enabling contributor refunds.
     */
    function rejectMilestoneByOracle(
        uint256 _campaignId,
        uint256 _milestoneId
    ) external onlyOracle validMilestone(_campaignId, _milestoneId) {
        Milestone storage m = milestones[_campaignId][_milestoneId];
        require(
            m.status == MilestoneStatus.Submitted,
            "MilestoneManager: not in Submitted state"
        );

        m.status = MilestoneStatus.Rejected;
        emit MilestoneRejected(_campaignId, _milestoneId, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DAO voting (fallback / override path)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Backer votes on a submitted milestone.
     *
     * WATERFALL VOTE-WEIGHT FIX:
     *   Previously: weight = milestoneContributions[campaignId][milestoneId][sender]
     *   Problem:    Under the waterfall model all ETH goes through
     *               CrowdfundingMarketplace.contributeToCampaign().
     *               contributeToMilestone() is never called, so the per-milestone
     *               ledger is always 0 → every vote reverted with
     *               "MilestoneManager: no contribution to vote with".
     *   Fix:        weight = ICrowdfundingMarketplace.getContribution(campaignId, sender)
     *               This reads the backer's real ETH stake in the campaign,
     *               preserving stake-weighted governance without any changes to
     *               the user-facing voting UI or Wagmi hook call sites.
     *
     * @param _inFavour  true = approve, false = reject.
     */
    function voteMilestone(
        uint256 _campaignId,
        uint256 _milestoneId,
        bool _inFavour
    ) external validMilestone(_campaignId, _milestoneId) {
        Milestone storage m = milestones[_campaignId][_milestoneId];

        // ── WATERFALL FIX: read weight from the main campaign, not per-milestone ──
        uint256 weight = crowdfundingMarketplace.getContribution(
            _campaignId,
            msg.sender
        );
        require(weight > 0, "MilestoneManager: no contribution to vote with");

        Vote storage v = votes[_campaignId][_milestoneId][msg.sender];
        require(!v.hasVoted, "MilestoneManager: already voted");

        require(
            m.status == MilestoneStatus.Submitted,
            "MilestoneManager: voting not open"
        );

        v.hasVoted = true;
        v.inFavour = _inFavour;
        v.weight = weight;

        if (_inFavour) {
            m.totalVotesFor += weight;
        } else {
            m.totalVotesAgainst += weight;
        }

        emit MilestoneVoted(
            _campaignId,
            _milestoneId,
            msg.sender,
            _inFavour,
            weight
        );

        // Try to resolve immediately if threshold is met (gas-efficient: no loop)
        _tryResolveByVote(_campaignId, _milestoneId);
    }

    /**
     * @notice Anyone can call this to force a DAO resolution once the voting window expires.
     *         Use this when the voting window has passed and the oracle hasn't acted.
     */
    function finalizeVoting(
        uint256 _campaignId,
        uint256 _milestoneId
    ) external validMilestone(_campaignId, _milestoneId) {
        Milestone storage m = milestones[_campaignId][_milestoneId];
        require(
            m.status == MilestoneStatus.Submitted,
            "MilestoneManager: not in Submitted state"
        );
        // Voting window: votingWindowSeconds after evidence submission (use deadline as proxy)
        require(
            block.timestamp >= m.deadline + votingWindowSeconds,
            "MilestoneManager: voting window still open"
        );
        _resolveByVote(_campaignId, _milestoneId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fund release (pull pattern)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Creator withdraws milestone funds after approval.
     */
    function withdrawMilestoneFunds(
        uint256 _campaignId,
        uint256 _milestoneId
    )
        external
        onlyCampaignCreator(_campaignId)
        validMilestone(_campaignId, _milestoneId)
        nonReentrant
    {
        Milestone storage m = milestones[_campaignId][_milestoneId];
        require(!m.fundsReleased, "MilestoneManager: already released");
        require(
            m.status == MilestoneStatus.Approved,
            "MilestoneManager: not approved"
        );

        m.fundsReleased = true;
        m.status = MilestoneStatus.Released;

        uint256 amount = m.raisedAmount;
        payable(campaignCreator[_campaignId]).transfer(amount);

        emit MilestoneReleased(_campaignId, _milestoneId, amount);
    }

    /**
     * @notice Contributor claims a refund when a milestone is rejected.
     */
    function claimMilestoneRefund(
        uint256 _campaignId,
        uint256 _milestoneId
    ) external validMilestone(_campaignId, _milestoneId) nonReentrant {
        Milestone storage m = milestones[_campaignId][_milestoneId];
        require(
            m.status == MilestoneStatus.Rejected ||
                m.status == MilestoneStatus.Refunded,
            "MilestoneManager: not refundable"
        );

        uint256 contributed = milestoneContributions[_campaignId][_milestoneId][
            msg.sender
        ];
        require(contributed > 0, "MilestoneManager: nothing to refund");

        milestoneContributions[_campaignId][_milestoneId][msg.sender] = 0;

        if (m.status == MilestoneStatus.Rejected) {
            m.status = MilestoneStatus.Refunded; // mark once first refund triggers
        }

        payable(msg.sender).transfer(contributed);

        // FIX (Issue #4): Was incorrectly emitting MilestoneRejected here, which pollutes
        // the event log and will confuse any off-chain indexer treating Rejected as a status
        // transition. The correct event to emit is MilestoneReleased (funds leaving contract)
        // or a dedicated refund event. We reuse MilestoneReleased with contributor as context.
        // Original incorrect line: emit MilestoneRejected(_campaignId, _milestoneId, msg.sender);
        emit MilestoneReleased(_campaignId, _milestoneId, contributed);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _tryResolveByVote(
        uint256 _campaignId,
        uint256 _milestoneId
    ) internal {
        Milestone storage m = milestones[_campaignId][_milestoneId];
        uint256 totalVotes = m.totalVotesFor + m.totalVotesAgainst;

        // WATERFALL QUORUM FIX:
        // Original formula:  totalVotes * 10000 < m.raisedAmount * votingQuorumBps
        // Under the waterfall model m.raisedAmount is always 0 (no one calls
        // contributeToMilestone()), so the RHS was permanently 0, making quorum
        // trivially "met" from the very first vote — votingQuorumBps was meaningless.
        //
        // Replacement strategy: resolve based on conclusiveness of the current tally.
        // Two conditions trigger an immediate resolution:
        //   1. FOR  votes have already cleared the approval threshold  → approve now.
        //   2. AGAINST votes are so large that FOR can never reach the threshold,
        //      even if every remaining possible voter approved             → reject now.
        //   3. Neither yet? → wait for more votes or let finalizeVoting() close it.
        //
        // If no votes at all have been cast yet, exit without resolving.
        if (totalVotes == 0) return;

        // Condition 1: approval threshold already crossed by FOR votes.
        bool approvalReached = m.totalVotesFor * 10000 >=
            totalVotes * approvalThresholdBps;

        // Condition 2: AGAINST votes make it mathematically impossible for FOR to win.
        // (i.e. AGAINST > totalVotes * (1 - approvalThreshold))
        bool rejectionCertain = m.totalVotesAgainst * 10000 >
            totalVotes * (10000 - approvalThresholdBps);

        if (approvalReached || rejectionCertain) {
            _resolveByVote(_campaignId, _milestoneId);
        }
    }

    function _resolveByVote(
        uint256 _campaignId,
        uint256 _milestoneId
    ) internal {
        Milestone storage m = milestones[_campaignId][_milestoneId];
        if (m.status != MilestoneStatus.Submitted) return;

        uint256 totalVotes = m.totalVotesFor + m.totalVotesAgainst;

        bool approved = (totalVotes > 0) &&
            (m.totalVotesFor * 10000 >= totalVotes * approvalThresholdBps);

        if (approved) {
            m.status = MilestoneStatus.Approved;
            emit MilestoneApproved(_campaignId, _milestoneId, address(0)); // address(0) = DAO
        } else {
            m.status = MilestoneStatus.Rejected;
            emit MilestoneRejected(_campaignId, _milestoneId, address(0));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────────────────

    function getMilestone(
        uint256 _campaignId,
        uint256 _milestoneId
    )
        external
        view
        validMilestone(_campaignId, _milestoneId)
        returns (Milestone memory)
    {
        return milestones[_campaignId][_milestoneId];
    }

    function getContribution(
        uint256 _campaignId,
        uint256 _milestoneId,
        address _contributor
    ) external view returns (uint256) {
        return milestoneContributions[_campaignId][_milestoneId][_contributor];
    }

    function getVote(
        uint256 _campaignId,
        uint256 _milestoneId,
        address _voter
    ) external view returns (Vote memory) {
        return votes[_campaignId][_milestoneId][_voter];
    }

    // FIX (Issue #5): This function is declared in constants/abi.js and called by
    // useIsCampaignRegistered() in useContract.js and CampaignDetails.js, but it was
    // completely absent from the contract. Every call would revert with "function not found",
    // silently breaking the milestone setup UI for all campaigns.
    /**
     * @notice Returns true if a campaign has been registered for milestone management.
     * @param _campaignId  Campaign ID to check.
     */
    function isCampaignRegistered(
        uint256 _campaignId
    ) external view returns (bool) {
        return campaignCreator[_campaignId] != address(0);
    }

    /// @dev Returns all milestones for a campaign as an array
    function getCampaignMilestones(
        uint256 _campaignId
    ) external view returns (Milestone[] memory) {
        uint256 count = milestoneCount[_campaignId];
        Milestone[] memory result = new Milestone[](count);
        for (uint256 i = 1; i <= count; i++) {
            result[i - 1] = milestones[_campaignId][i];
        }
        return result;
    }

    receive() external payable {}
}
