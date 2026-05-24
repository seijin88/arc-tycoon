// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CosmeticChips} from "./CosmeticChips.sol";

/// @title TestnetFaucet — drip CHIP for Arc testnet playtests.
contract TestnetFaucet {
    CosmeticChips public immutable chips;
    uint256 public immutable dripAmount;
    uint256 public immutable cooldown;

    mapping(address => uint256) public lastClaim;

    error CooldownActive(uint256 availableAt);

    event Dripped(address indexed player, uint256 amount);

    constructor(address chips_, uint256 dripAmount_, uint256 cooldown_) {
        chips = CosmeticChips(chips_);
        dripAmount = dripAmount_;
        cooldown = cooldown_;
    }

    function claim() external {
        uint256 next = lastClaim[msg.sender] + cooldown;
        if (block.timestamp < next) {
            revert CooldownActive(next);
        }
        lastClaim[msg.sender] = block.timestamp;
        chips.mint(msg.sender, dripAmount);
        emit Dripped(msg.sender, dripAmount);
    }
}
