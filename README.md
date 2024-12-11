# COMP0163-Blockchain-Coursework
Track 1: Blockchain Application

## How to run the code
1. Clone the repository
2. Run the following command to install the required packages
```
cd COMP0163-Blockchain-Coursework
cd backend
npm install
npx hardhat compile
npx hardhat test
```
Overall test results will be displayed in the terminal.

## Or it can be found at result.txt in the root directory


# Smart Contract specification
How will our Voting protocol (Voting.sol) work?
1. Deploy the contract
2. Represents with valid tokens will be able to vote
3. The contract will check the token balance of the voter
4. There will be three voting topics for the voter to vote
5. Once all three topics are voted, the contract will calculate the total votes for each topic
6. Once the votes achieved the majority, the contract will initialize the reward contract, the AMM contract, and the supply chain contract
7. If the vote fails, the contract owner will need to initialize a revote and the contract will reset the voting status, for all topics
8. A new token address will be added to the contract for the next vote
9. Repeat the process until the vote achieved the majority
Note: to prevent people interact with contract, not release carbon credit until the vote passed, as this is the "fuel" for the whole system

How will our AMM (Exchange.sol) work?
1. Deploy the contract
2. Add liquidity to the contract
3. Swap tokens
4. Remove liquidity

How will our supply chain (SupplyChain.sol) work?
This contract allows the company to manage and track its CO2 emissions by using carbon credit Tokens
1. Deploy the contract, set the owner
2. Topup the contract with carbon credit tokens
3. Distribute or transfer the carbon credit tokens to the factories 
4. Factories spend the carbon credit tokens to emit CO2 (under the Credit Manager or the Company's name e.g., IBM)
5. The contract will check the CO2 emission (pseudo function) and calculate the carbon credit tokens to be burned, assuming 1:1 ratio
6. The contract will burn the carbon credit tokens
7. The contract can calculate the total carbon credit tokens burned each year to generate yearly usage data
8. Usage data can be used to generate a report for the company or the government
9. Usage data can be used to request reward from the reward contract

How will our reward contract (Reward.sol) work?
1. Deploy the contract
2. The company holds a valid supply chain contract address and can request a reward
3. Inspect the contract by checking if the contract holds a valid token address
4. If passes the inspection then proceed to the emission usage check
5. Emission usage check will check the total carbon credit tokens burned in the last 2 years, if downtrend detected then proceed to reward calculation
6. Reward calculation will calculate the reward based on the total carbon credit tokens burned in the last 2 years
7. Release the reward to the company

How will our carbon credit token (CarbonCreditToken.sol) work?
It served as the token for the supply chain contract and the reward contract, controlled by the organisation or the government

How will our voting token (VotingToken.sol) work?
It served as the token for the voting contract, controlled by the organisation or the government
As it is a voting token, it won't be tradable
Only the owner of the contract can transfer the token to the voter
