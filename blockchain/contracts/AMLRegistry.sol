// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AMLRegistry {
    address public owner;
    address public oracle;

    struct UserRecord {
        bool isVerified;
        uint256 verifiedAt;
        uint256 riskScore;
        bool isFlagged;
    }

    mapping(address => UserRecord) public users;

    event UserVerified(address indexed wallet, uint256 timestamp);
    event UserFlagged(address indexed wallet, uint256 riskScore, uint256 timestamp);
    event UserUnflagged(address indexed wallet, uint256 timestamp);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _oracle) {
        owner = msg.sender;
        oracle = _oracle;
    }

    function verifyUser(address wallet) external onlyOracle {
        users[wallet].isVerified = true;
        users[wallet].verifiedAt = block.timestamp;
        emit UserVerified(wallet, block.timestamp);
    }

    function flagUser(address wallet, uint256 riskScore) external onlyOracle {
        users[wallet].isFlagged = true;
        users[wallet].riskScore = riskScore;
        emit UserFlagged(wallet, riskScore, block.timestamp);
    }

    function unflagUser(address wallet) external onlyOracle {
        users[wallet].isFlagged = false;
        emit UserUnflagged(wallet, block.timestamp);
    }

    function isVerified(address wallet) external view returns (bool) {
        return users[wallet].isVerified;
    }

    function isFlagged(address wallet) external view returns (bool) {
        return users[wallet].isFlagged;
    }

    function getUserRecord(address wallet) external view returns (UserRecord memory) {
        return users[wallet];
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
}
