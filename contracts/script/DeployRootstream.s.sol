// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Rootstream} from "../src/Rootstream.sol";

/// @notice Deploy `Rootstream` to any EVM chain (Rootstock Testnet chain id 31).
contract DeployRootstream is Script {
    function run() external returns (Rootstream rootstream) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        rootstream = new Rootstream();
        vm.stopBroadcast();

        console2.log("Deployer:", vm.addr(pk));
        console2.log("Rootstream:", address(rootstream));
    }
}
