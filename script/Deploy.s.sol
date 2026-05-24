// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {CosmeticChips} from "../src/CosmeticChips.sol";
import {OutfitNFT} from "../src/OutfitNFT.sol";
import {CosmeticRegistry} from "../src/CosmeticRegistry.sol";
import {MatchFactory} from "../src/MatchFactory.sol";
import {TestnetFaucet} from "../src/TestnetFaucet.sol";

/// @notice Deploy full stack to Arc Testnet.
/// forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_TESTNET_RPC_URL --broadcast
contract Deploy is Script {
    uint256 public constant DRIP_AMOUNT = 5000 ether;
    uint256 public constant DRIP_COOLDOWN = 1 hours;
    uint16 public constant FEE_BPS = 500; // 5% to treasury

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        CosmeticChips chips = new CosmeticChips(deployer);
        OutfitNFT outfits = new OutfitNFT(deployer);
        CosmeticRegistry registry = new CosmeticRegistry(deployer, address(outfits));
        MatchFactory factory = new MatchFactory(deployer, address(chips), address(registry), deployer, FEE_BPS);
        TestnetFaucet faucet = new TestnetFaucet(address(chips), DRIP_AMOUNT, DRIP_COOLDOWN);

        chips.grantRole(chips.MINTER_ROLE(), address(faucet));
        chips.grantRole(chips.MINTER_ROLE(), deployer);

        outfits.grantRole(outfits.MINTER_ROLE(), deployer);

        vm.stopBroadcast();

        console2.log("CosmeticChips", address(chips));
        console2.log("OutfitNFT", address(outfits));
        console2.log("CosmeticRegistry", address(registry));
        console2.log("MatchFactory", address(factory));
        console2.log("TestnetFaucet", address(faucet));
        console2.log("Treasury", deployer);
    }
}
