// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";
/**
 * @title Exchange contract
 * @notice 
 * This contract is to swap between Carbon Credits and DEAI tokens(ERC20 tokens or any other token e.g., ETH, USDT, etc.)
 * Users can swap between Carbon Credits and DEAI tokens
 * Users can add liquidity to the pool
 * Users can remove liquidity from the pool
 */
contract Exchange {
    // code mainly learned from UCL COMP0163-Blockchain Lab 5
    IERC20 public immutable carbonCreditToken; // Carbon Credit token
    IERC20 public immutable deaiToken; // DEAI token
    
    uint256 public reserveCarbonCredit; // Reserve of Carbon Credits
    uint256 public reserveDEAI; // Reserve of DEAI tokens , or any other token e.g., ETH, USDT, etc.
    uint256 public totalSupply; // Total liquidity shares
    mapping(address => uint256) public balanceOf; // Tracks shares of liquidity providers

    event Swap(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);
    event AddLiquidity(address indexed user, uint256 amountCarbonCredit, uint256 amountDEAI, uint256 shares);
    event RemoveLiquidity(address indexed user, uint256 shares, uint256 amountCarbonCredit, uint256 amountDEAI);
    event UpdateReserves(uint256 reserveCarbonCredit, uint256 reserveDEAI);

    constructor(address _carbonCreditToken, address _deaiToken) {
        carbonCreditToken = IERC20(_carbonCreditToken);
        deaiToken = IERC20(_deaiToken);
    }

    function _mint(address _to, uint256 _amount) private {
        balanceOf[_to] += _amount;
        totalSupply += _amount;
    }

    function _burn(address _from, uint256 _amount) private {
        balanceOf[_from] -= _amount;
        totalSupply -= _amount;
    }

    function _update(uint256 _reserveCarbonCredit, uint256 _reserveDEAI) private {
        reserveCarbonCredit = _reserveCarbonCredit;
        reserveDEAI = _reserveDEAI;
        emit UpdateReserves(_reserveCarbonCredit, _reserveDEAI);
    }

    function swap(address _tokenIn, uint256 _amountIn) external returns (uint256 amountOut) {
        require(
            _tokenIn == address(carbonCreditToken) || _tokenIn == address(deaiToken),
            "Invalid token"
        );
        require(_amountIn > 0, "Amount in must be greater than 0");

        bool isCarbonCredit = _tokenIn == address(carbonCreditToken);
        (IERC20 tokenIn, IERC20 tokenOut, uint256 reserveIn, uint256 reserveOut) = isCarbonCredit
            ? (carbonCreditToken, deaiToken, reserveCarbonCredit, reserveDEAI)
            : (deaiToken, carbonCreditToken, reserveDEAI, reserveCarbonCredit);

        tokenIn.transferFrom(msg.sender, address(this), _amountIn);

        // Apply 0.1% fee
        uint256 amountInWithFee = (_amountIn * 999) / 1000;
        amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

        tokenOut.transfer(msg.sender, amountOut);

        _update(
            carbonCreditToken.balanceOf(address(this)),
            deaiToken.balanceOf(address(this))
        );

        emit Swap(msg.sender, _tokenIn, _amountIn, amountOut);
    }

    /**
     * @dev Add liquidity to the pool
     * @param _amountCarbonCredit The amount of Carbon Credits to add
     * @param _amountDEAI The amount of DEAI tokens to add
     * @return shares The amount of liquidity shares minted
     */
    function addLiquidity(uint256 _amountCarbonCredit, uint256 _amountDEAI) external returns (uint256 shares) {
        carbonCreditToken.transferFrom(msg.sender, address(this), _amountCarbonCredit);
        deaiToken.transferFrom(msg.sender, address(this), _amountDEAI);

        if (reserveCarbonCredit > 0 || reserveDEAI > 0) {
            require(
                reserveCarbonCredit * _amountDEAI == reserveDEAI * _amountCarbonCredit,
                "Invalid ratio"
            );
        }

        if (totalSupply == 0) {
            shares = _sqrt(_amountCarbonCredit * _amountDEAI);
        } else {
            shares = _min(
                (_amountCarbonCredit * totalSupply) / reserveCarbonCredit,
                (_amountDEAI * totalSupply) / reserveDEAI
            );
        }
        require(shares > 0, "Shares must be greater than 0");
        _mint(msg.sender, shares);

        _update(
            carbonCreditToken.balanceOf(address(this)),
            deaiToken.balanceOf(address(this))
        );

        emit AddLiquidity(msg.sender, _amountCarbonCredit, _amountDEAI, shares);
    }

    /**
     * @dev Remove liquidity from the pool
     * @param _shares The amount of liquidity shares to remove
     * @return amountCarbonCredit The amount of Carbon Credits to receive
     * @return amountDEAI The amount of DEAI tokens to receive
     */
    function removeLiquidity(uint256 _shares) external returns (uint256 amountCarbonCredit, uint256 amountDEAI) {
        uint256 balCarbonCredit = carbonCreditToken.balanceOf(address(this));
        uint256 balDEAI = deaiToken.balanceOf(address(this));

        amountCarbonCredit = (_shares * balCarbonCredit) / totalSupply;
        amountDEAI = (_shares * balDEAI) / totalSupply;

        require(amountCarbonCredit > 0 && amountDEAI > 0, "Amounts must be greater than 0");

        _burn(msg.sender, _shares);
        _update(balCarbonCredit - amountCarbonCredit, balDEAI - amountDEAI);

        carbonCreditToken.transfer(msg.sender, amountCarbonCredit);
        deaiToken.transfer(msg.sender, amountDEAI);

        emit RemoveLiquidity(msg.sender, _shares, amountCarbonCredit, amountDEAI);
    }

    /**
     * @dev Calculate the square root of a number
     * @param y The number to calculate the square root of
     * @return z The square root of the number
     */
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }
}