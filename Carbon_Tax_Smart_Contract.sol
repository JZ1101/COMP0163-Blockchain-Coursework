// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;


contract ProgressiveCarbonTaxManager {
    address public owner;
    uint256[] public taxBrackets; 
    uint256[] public taxRates;    

    mapping(address => uint256) public emissions; 
    mapping(address => uint256) public taxesDue;   

    event TaxUpdated(address indexed company, uint256 taxAmount);
    event EmissionReported(address indexed company, uint256 amount);
    event TaxPaid(address indexed company, uint256 taxAmount);

    constructor(uint256[] memory _taxBrackets, uint256[] memory _taxRates) {
        require(_taxBrackets.length == _taxRates.length, "Brackets and rates length must match");
        owner = msg.sender;
        taxBrackets = _taxBrackets;
        taxRates = _taxRates;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;
    }

    function adjustTaxBrackets(uint256[] calldata _newBrackets, uint256[] calldata _newRates) public onlyOwner {
        require(_newBrackets.length == _newRates.length, "Brackets and rates length must match");
        taxBrackets = _newBrackets;
        taxRates = _newRates;
    }

    // Companies report their emissions
    function reportEmissions(uint256 _amount) public {
        emissions[msg.sender] = _amount;
        updateTaxDue(msg.sender);
        emit EmissionReported(msg.sender, _amount);
    }

    // Internal function to calculate and update tax due based on progressive tax rates
    function updateTaxDue(address _company) internal {
        uint256 due = calculateTax(emissions[_company]);
        taxesDue[_company] = due;
        emit TaxUpdated(_company, due);
    }

    // Calculate the tax based on the reported emissions and the tax brackets
    function calculateTax(uint256 _emissions) internal view returns (uint256) {
        uint256 tax = 0;
        uint256 remainingEmissions = _emissions;

        for (uint256 i = 0; i < taxBrackets.length; i++) {
            if (i == taxBrackets.length - 1 || remainingEmissions <= taxBrackets[i]) {
                tax += remainingEmissions * taxRates[i];
                break;
            } else {
                uint256 taxedEmissions = taxBrackets[i];
                tax += taxedEmissions * taxRates[i];
                remainingEmissions -= taxedEmissions;
            }
        }

        return tax;
    }

    // Companies pay their taxes
    function payTax() public payable {
        require(taxesDue[msg.sender] <= msg.value, "Insufficient payment.");
        taxesDue[msg.sender] = 0;
        emit TaxPaid(msg.sender, msg.value);
    }

    // Get the tax due for a company
    function getTaxDue(address _company) public view returns (uint256) {
        return taxesDue[_company];
    }

    // Optional: Return the funds in case of overpayment or errors
    function refundTax(address _company, uint256 _amount) public onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance in contract.");
        payable(_company).transfer(_amount);
    }
}
