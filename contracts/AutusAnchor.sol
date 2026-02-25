// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * AutusAnchor — AUTUS Proof Layer L2 Anchor
 * Chain: Base Mainnet (chainId 8453)
 *
 * 역할: 일별 Merkle Root를 온체인에 기록하여
 *       교육 데이터의 무결성을 검증 가능하게 합니다.
 *
 * 사용:
 *   1. 매일 00:05 KST proof-anchor Edge Function이 호출
 *   2. anchor(merkleRoot, leafCount) → 온체인 기록
 *   3. 누구나 getAnchor(merkleRoot)로 검증 가능
 *
 * Gas 최적화:
 *   - 하루 1회 호출 기준 ~50,000 gas
 *   - Base L2 기준 $0.01 미만/일
 */

contract AutusAnchor {
    address public owner;

    struct Anchor {
        uint256 leafCount;
        uint256 timestamp;
        uint256 blockNumber;
    }

    // merkleRoot => Anchor data
    mapping(bytes32 => Anchor) public anchors;

    // 전체 앵커 수
    uint256 public anchorCount;

    // Events
    event Anchored(
        bytes32 indexed merkleRoot,
        uint256 leafCount,
        uint256 timestamp
    );
    event OwnerTransferred(address indexed prev, address indexed next);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice 일별 Merkle Root를 온체인에 기록
     * @param merkleRoot 당일 proof_records의 Merkle Root (SHA-256)
     * @param leafCount  proof_records 개수
     */
    function anchor(bytes32 merkleRoot, uint256 leafCount) external onlyOwner {
        require(merkleRoot != bytes32(0), "empty root");
        require(anchors[merkleRoot].timestamp == 0, "already anchored");

        anchors[merkleRoot] = Anchor({
            leafCount: leafCount,
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        anchorCount++;

        emit Anchored(merkleRoot, leafCount, block.timestamp);
    }

    /**
     * @notice Merkle Root 검증 조회 (누구나 호출 가능)
     * @param merkleRoot 조회할 Merkle Root
     * @return leafCount 기록된 leaf 수
     * @return timestamp 기록 시점
     * @return blockNumber 기록된 블록
     */
    function getAnchor(bytes32 merkleRoot) external view returns (
        uint256 leafCount,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        Anchor memory a = anchors[merkleRoot];
        return (a.leafCount, a.timestamp, a.blockNumber);
    }

    /**
     * @notice Owner 이전 (비상용)
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }
}
