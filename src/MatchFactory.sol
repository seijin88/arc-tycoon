// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {CosmeticChips} from "./CosmeticChips.sol";
import {GameMatch} from "./GameMatch.sol";

/// @title MatchFactory — creates isolated GameMatch instances.
contract MatchFactory is AccessControl {
    CosmeticChips public immutable chips;
    address public immutable registry;
    address public immutable treasury;
    uint16 public feeBps;

    event MatchCreated(address indexed matchAddress, address indexed host, uint256 stakeAmount);

    constructor(address admin, address chips_, address registry_, address treasury_, uint16 feeBps_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        chips = CosmeticChips(chips_);
        registry = registry_;
        treasury = treasury_;
        feeBps = feeBps_;
    }

    function setFeeBps(uint16 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 2000, "fee too high");
        feeBps = newFeeBps;
    }

    function createMatch(uint256 stakeAmount) external returns (address matchAddress) {
        GameMatch matchContract = new GameMatch(address(chips), registry, treasury, feeBps, stakeAmount, msg.sender);
        matchAddress = address(matchContract);
        emit MatchCreated(matchAddress, msg.sender, stakeAmount);
    }
}
