// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title CosmeticRegistry — approved outfit stats and loadout validation.
contract CosmeticRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum Slot {
        Head,
        Body,
        Feet,
        Accessory
    }

    struct ItemStats {
        Slot slot;
        uint16 luckBps;
        bool active;
    }

  /// @dev Max total luck from all equipped items (5%).
    uint16 public constant MAX_LUCK_BPS = 500;

    IERC721 public immutable outfitNft;

    mapping(uint256 tokenId => ItemStats) public items;

    error UnknownItem(uint256 tokenId);
    error InactiveItem(uint256 tokenId);
    error NotOwner(address player, uint256 tokenId);
    error DuplicateSlot(Slot slot);
    error LuckCapExceeded(uint16 total);

    event ItemRegistered(uint256 indexed tokenId, Slot slot, uint16 luckBps);

    constructor(address admin, address outfitNft_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
        outfitNft = IERC721(outfitNft_);
    }

    function registerItem(uint256 tokenId, Slot slot, uint16 luckBps) external onlyRole(REGISTRAR_ROLE) {
        if (luckBps > MAX_LUCK_BPS) revert LuckCapExceeded(luckBps);
        items[tokenId] = ItemStats({slot: slot, luckBps: luckBps, active: true});
        emit ItemRegistered(tokenId, slot, luckBps);
    }

    /// @notice Returns total luck bps for a loadout (max 4 items, one per slot).
    function resolveLuckBps(address player, uint256[] calldata tokenIds)
        external
        view
        returns (uint16 totalLuckBps)
    {
        bool[4] memory slotUsed;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            ItemStats memory item = items[tokenId];
            if (!item.active) revert InactiveItem(tokenId);
            if (outfitNft.ownerOf(tokenId) != player) revert NotOwner(player, tokenId);

            uint8 slotIndex = uint8(item.slot);
            if (slotUsed[slotIndex]) revert DuplicateSlot(item.slot);
            slotUsed[slotIndex] = true;

            totalLuckBps += item.luckBps;
            if (totalLuckBps > MAX_LUCK_BPS) revert LuckCapExceeded(totalLuckBps);
        }
    }
}
