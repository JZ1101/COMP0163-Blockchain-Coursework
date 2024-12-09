// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VoteToken.sol";
import "./Voting.sol";

contract VotingDeployer {
    event TokenDeployed(address indexed tokenAddress);
    event VotingContractDeployed(address indexed votingContractAddress);

    struct VotingResult {
        string topic;
        bool hasPassed;
    }

    /**
     * @dev Deploys a new instance of the VoteToken contract.
     * @param initialSupply The initial supply of the token.
     * @return The address of the newly deployed VoteToken contract.
     */
    function deployVoteToken(uint256 initialSupply) external returns (address) {
        VoteToken voteToken = new VoteToken(initialSupply);
        emit TokenDeployed(address(voteToken));
        return address(voteToken);
    }

    /**
     * @dev Deploys a new instance of the Voting contract linked to a specified VoteToken.
     * @param voteTokenAddress The address of the VoteToken contract to use for voting.
     * @return The address of the newly deployed Voting contract.
     */
    function deployVotingContract(address voteTokenAddress) external returns (address) {
        require(voteTokenAddress != address(0), "Invalid token address");
        Voting voting = new Voting(msg.sender, voteTokenAddress);
        emit VotingContractDeployed(address(voting));
        return address(voting);
    }

    /**
     * @dev Fetches whether a topic has passed from the Voting contract.
     * @param votingContract The address of the Voting contract.
     * @param topic The topic to check (e.g., "AMM", "SupplyChain", "Reward").
     * @return A VotingResult struct containing the topic and whether it has passed.
     */
    function checkIfTopicPassed(address votingContract, string memory topic) external view returns (VotingResult memory) {
        require(votingContract != address(0), "Invalid voting contract address");
        Voting voting = Voting(votingContract);

        bool result = voting.hasTopicPassed(topic);
        return VotingResult({ topic: topic, hasPassed: result });
    }
}