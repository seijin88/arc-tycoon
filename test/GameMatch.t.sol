// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CosmeticChips} from "../src/CosmeticChips.sol";
import {OutfitNFT} from "../src/OutfitNFT.sol";
import {CosmeticRegistry} from "../src/CosmeticRegistry.sol";
import {MatchFactory} from "../src/MatchFactory.sol";
import {GameMatch} from "../src/GameMatch.sol";

contract GameMatchTest is Test {
    CosmeticChips chips;
    OutfitNFT outfits;
    CosmeticRegistry registry;
    MatchFactory factory;

    address admin = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant STAKE = 100 ether;

    function setUp() public {
        chips = new CosmeticChips(admin);
        outfits = new OutfitNFT(admin);
        registry = new CosmeticRegistry(admin, address(outfits));
        factory = new MatchFactory(admin, address(chips), address(registry), admin, 500);

        chips.mint(alice, 10_000 ether);
        chips.mint(bob, 10_000 ether);
        chips.mint(carol, 10_000 ether);
    }

    function _approveAndJoin(address player, GameMatch matchContract) internal {
        vm.startPrank(player);
        chips.approve(address(matchContract), STAKE);
        matchContract.joinMatch(new uint256[](0));
        vm.stopPrank();
    }

    function test_create_join_start() public {
        vm.prank(alice);
        address matchAddr = factory.createMatch(STAKE);
        GameMatch matchContract = GameMatch(matchAddr);

        assertEq(matchContract.host(), alice);
        _approveAndJoin(alice, matchContract);
        _approveAndJoin(bob, matchContract);

        vm.prank(alice);
        matchContract.startMatch();

        assertEq(uint8(matchContract.phase()), uint8(GameMatch.Phase.Active));
    }

    function test_lowest_net_worth_at_start() public {
        vm.prank(alice);
        GameMatch matchContract = GameMatch(factory.createMatch(STAKE));
        _approveAndJoin(alice, matchContract);
        _approveAndJoin(bob, matchContract);

        vm.prank(alice);
        matchContract.startMatch();

        assertEq(matchContract.lowestActiveNetWorth(), 1500);
        assertEq(matchContract.netWorth(alice), 1500);
    }

    function test_registry_luck_cap() public {
        uint256 t1 = outfits.mint(alice);
        uint256 t2 = outfits.mint(alice);
        registry.registerItem(t1, CosmeticRegistry.Slot.Head, 250);
        registry.registerItem(t2, CosmeticRegistry.Slot.Body, 250);

        uint256[] memory ids = new uint256[](2);
        ids[0] = t1;
        ids[1] = t2;

        uint16 luck = registry.resolveLuckBps(alice, ids);
        assertEq(luck, 500);

        uint256 t3 = outfits.mint(alice);
        registry.registerItem(t3, CosmeticRegistry.Slot.Feet, 100);
        ids = new uint256[](3);
        ids[0] = t1;
        ids[1] = t2;
        ids[2] = t3;
        vm.expectRevert();
        registry.resolveLuckBps(alice, ids);
    }

    function test_bet_resolves_and_match_continues() public {
        vm.prank(alice);
        GameMatch m = GameMatch(factory.createMatch(STAKE));
        _approveAndJoin(alice, m);
        _approveAndJoin(bob, m);

        vm.prank(alice);
        m.startMatch();

        assertFalse(m.betResolved());
        assertEq(m.potSize(), STAKE * 2);
    }
}
