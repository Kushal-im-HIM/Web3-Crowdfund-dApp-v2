// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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

    /// @dev campaignId  => milestoneId => Milestone
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;

    /// @dev campaignId  => milestone count (used as next ID)
    mapping(uint256 => uint256) public milestoneCount;

    /// @dev campaignId  => creator address (opt-in registration)
    mapping(uint256 => address) public campaignCreator;

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

    constructor(address _oracleAddress) {
        require(
            _oracleAddress != address(0),
            "MilestoneManager: oracle is zero address"
        );
        oracleAddress = _oracleAddress;
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
     * @param _campaignId  ID of the campaign in CrowdfundingMarketplace.
     */
    function registerCampaign(uint256 _campaignId) external {
        require(
            campaignCreator[_campaignId] == address(0),
            "MilestoneManager: already registered"
        );
        campaignCreator[_campaignId] = msg.sender;
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

        if (
            milestoneContributions[_campaignId][_milestoneId][msg.sender] == 0
        ) {
            m.contributorsCount++;
        }
        milestoneContributions[_campaignId][_milestoneId][msg.sender] += msg
            .value;
        m.raisedAmount += msg.value;

        emit MilestoneFunded(_campaignId, _milestoneId, msg.sender, msg.value);
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
     *         Weight = ETH contributed to this milestone by the voter.
     *         Design choice: proportional-to-contribution (vs one-vote-per-backer)
     *         because it aligns financial stake with governance power and prevents
     *         Sybil attacks via address splitting.
     * @param _inFavour  true = approve, false = reject.
     */
    function voteMilestone(
        uint256 _campaignId,
        uint256 _milestoneId,
        bool _inFavour
    ) external validMilestone(_campaignId, _milestoneId) {
        Milestone storage m = milestones[_campaignId][_milestoneId];

        uint256 weight = milestoneContributions[_campaignId][_milestoneId][
            msg.sender
        ];
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

        // Try to resolve immediately if quorum is met (gas-efficient: no loop)
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
        emit MilestoneRejected(_campaignId, _milestoneId, msg.sender); // reuse event for audit
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

        // Quorum not met yet — wait
        if (totalVotes * 10000 < m.raisedAmount * votingQuorumBps) return;

        // Quorum met: only auto-approve if FOR votes cross the threshold
        // Never auto-reject mid-vote — remaining voters may still push it over
        bool approvalReached = m.totalVotesFor * 10000 >=
            totalVotes * approvalThresholdBps;
        if (approvalReached) {
            _resolveByVote(_campaignId, _milestoneId);
        }
        // If quorum met but FOR hasn't won yet, wait — rejection resolved via finalizeVoting()
        // Exception: all raised amount has voted, no more votes possible
        else if (totalVotes == m.raisedAmount) {
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
