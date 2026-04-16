// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TransactionMonitor {
    address public oracle;

    struct FlaggedTransaction {
        address wallet;
        bytes32 txHash;
        uint256 riskScore;
        uint256 timestamp;
        string riskLevel;
    }

    FlaggedTransaction[] public flaggedTransactions;
    mapping(address => uint256[]) public userFlaggedIndices;

    event TransactionFlagged(
        address indexed wallet,
        bytes32 txHash,
        uint256 riskScore,
        string riskLevel,
        uint256 timestamp
    );

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor(address _oracle) {
        oracle = _oracle;
    }

    function logTransaction(
        address wallet,
        bytes32 txHash,
        uint256 riskScore,
        string calldata riskLevel
    ) external onlyOracle {
        uint256 index = flaggedTransactions.length;
        flaggedTransactions.push(FlaggedTransaction({
            wallet: wallet,
            txHash: txHash,
            riskScore: riskScore,
            timestamp: block.timestamp,
            riskLevel: riskLevel
        }));
        userFlaggedIndices[wallet].push(index);
        emit TransactionFlagged(wallet, txHash, riskScore, riskLevel, block.timestamp);
    }

    function getUserFlaggedCount(address wallet) external view returns (uint256) {
        return userFlaggedIndices[wallet].length;
    }

    function getFlaggedTransaction(uint256 index) external view returns (FlaggedTransaction memory) {
        require(index < flaggedTransactions.length, "Index out of bounds");
        return flaggedTransactions[index];
    }

    function getTotalFlagged() external view returns (uint256) {
        return flaggedTransactions.length;
    }
}
