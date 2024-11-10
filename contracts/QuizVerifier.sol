// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title QuizVerifier
 * @dev Manages quiz answer verification
 */
contract QuizVerifier is Initializable, AccessControlUpgradeable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Answer hashes by pool and user
    mapping(uint256 => mapping(address => bytes32)) public answerHashes;
    
    // Pool completion timestamps
    mapping(uint256 => uint256) public poolEndTimes;

    // Events
    event AnswerSubmitted(uint256 indexed poolId, address indexed user, bytes32 answerHash);
    event AnswersBatchSubmitted(uint256 indexed poolId, uint256 count);
    event PoolEndTimeSet(uint256 indexed poolId, uint256 endTime);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address operator) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, operator);
    }

    function setPoolEndTime(uint256 poolId, uint256 endTime) external onlyRole(OPERATOR_ROLE) {
        require(endTime > block.timestamp, "End time must be in future");
        require(poolEndTimes[poolId] == 0, "End time already set");
        poolEndTimes[poolId] = endTime;
        emit PoolEndTimeSet(poolId, endTime);
    }

    function submitAnswerHash(
        uint256 poolId,
        address user,
        bytes32 answerHash
    ) external onlyRole(OPERATOR_ROLE) {
        require(poolEndTimes[poolId] > block.timestamp, "Pool ended");
        require(answerHashes[poolId][user] == bytes32(0), "Answer already submitted");
        
        answerHashes[poolId][user] = answerHash;
        emit AnswerSubmitted(poolId, user, answerHash);
    }

    function submitAnswerHashBatch(
        uint256 poolId,
        address[] calldata users,
        bytes32[] calldata hashes
    ) external onlyRole(OPERATOR_ROLE) {
        require(poolEndTimes[poolId] > block.timestamp, "Pool ended");
        require(users.length == hashes.length, "Arrays length mismatch");
        require(users.length > 0, "Empty arrays");

        for (uint i = 0; i < users.length; i++) {
            require(answerHashes[poolId][users[i]] == bytes32(0), "Answer already exists");
            answerHashes[poolId][users[i]] = hashes[i];
            emit AnswerSubmitted(poolId, users[i], hashes[i]);
        }

        emit AnswersBatchSubmitted(poolId, users.length);
    }

    function getAnswerHash(uint256 poolId, address user) external view returns (bytes32) {
        return answerHashes[poolId][user];
    }

    function verifyAnswerHash(
        uint256 poolId,
        address user,
        bytes32 hash
    ) external view returns (bool) {
        // require(poolEndTimes[poolId] > 0, "Pool not initialized");
        // require(block.timestamp >= poolEndTimes[poolId], "Pool not ended");
        return answerHashes[poolId][user] == hash;
    }

    function getPoolEndTime(uint256 poolId) external view returns (uint256) {
        return poolEndTimes[poolId];
    }
}