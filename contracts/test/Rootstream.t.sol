// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Rootstream} from "../src/Rootstream.sol";

contract ReentrantRecipient {
    Rootstream public immutable rs;
    uint256 public streamId;

    constructor(Rootstream rs_) {
        rs = rs_;
    }

    function setStreamId(uint256 id) external {
        streamId = id;
    }

    receive() external payable {
        if (streamId != 0) {
            rs.executePayment(streamId);
        }
    }
}

contract RejectingRecipient {
    receive() external payable {
        revert("no");
    }
}

contract RootstreamTest is Test {
    Rootstream internal rs;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal gelato = makeAddr("gelato");

    uint256 internal constant INTERVAL = 7 days;
    uint256 internal constant AMOUNT = 1 ether;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 amountPerInterval,
        uint256 interval,
        uint256 lastExecuted
    );

    event PaymentExecuted(
        uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 amount, uint256 timestamp
    );

    event StreamCancelled(uint256 indexed streamId, address indexed sender);

    event FundsDeposited(address indexed user, uint256 amount, uint256 newBalance);

    event FundsWithdrawn(address indexed user, uint256 amount, uint256 indexed streamId);

    function setUp() public {
        rs = new Rootstream();
        vm.deal(alice, 100 ether);
        vm.deal(bob, 1 ether);
        vm.deal(gelato, 1 ether);
    }

    function test_depositFunds_increasesBalance_and_emits() public {
        vm.expectEmit(true, true, true, true);
        emit FundsDeposited(alice, 5 ether, 5 ether);

        vm.prank(alice);
        rs.depositFunds{value: 5 ether}();

        assertEq(rs.balances(alice), 5 ether);
        assertEq(address(rs).balance, 5 ether);
    }

    function test_depositFunds_reverts_zeroValue() public {
        vm.prank(alice);
        vm.expectRevert(Rootstream.ZeroAmount.selector);
        rs.depositFunds{value: 0}();
    }

    function test_receive_creditsBalance_likeDeposit() public {
        vm.prank(alice);
        (bool ok,) = address(rs).call{value: 3 ether}("");
        assertTrue(ok);
        assertEq(rs.balances(alice), 3 ether);
    }

    function test_receive_reverts_zeroValue() public {
        vm.prank(alice);
        vm.expectRevert(Rootstream.ZeroAmount.selector);
        (bool ok,) = address(rs).call{value: 0}("");
        assertTrue(ok);
    }

    function test_createStream_reverts_zeroRecipient() public {
        vm.prank(alice);
        vm.expectRevert(Rootstream.ZeroAddress.selector);
        rs.createStream(address(0), AMOUNT, INTERVAL);
    }

    function test_createStream_reverts_zeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Rootstream.ZeroAmount.selector);
        rs.createStream(bob, 0, INTERVAL);
    }

    function test_createStream_reverts_zeroInterval() public {
        vm.prank(alice);
        vm.expectRevert(Rootstream.ZeroInterval.selector);
        rs.createStream(bob, AMOUNT, 0);
    }

    function test_createStream_setsFields_and_listsUserStreams() public {
        vm.startPrank(alice);
        vm.expectEmit(true, true, true, true);
        emit StreamCreated(1, alice, bob, AMOUNT, INTERVAL, block.timestamp);

        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);
        vm.stopPrank();

        assertEq(id, 1);
        assertEq(rs.nextStreamId(), 2);
        assertEq(rs.activeStreamCount(alice), 1);

        uint256[] memory ids = rs.getUserStreams(alice);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);

        Rootstream.Stream memory s = rs.getStreamDetails(1);
        assertEq(s.sender, alice);
        assertEq(s.recipient, bob);
        assertEq(s.amountPerInterval, AMOUNT);
        assertEq(s.interval, INTERVAL);
        assertEq(s.lastExecuted, block.timestamp);
        assertTrue(s.active);
    }

    function test_executePayment_reverts_unknownStream() public {
        vm.expectRevert(Rootstream.UnknownStream.selector);
        rs.executePayment(999);
    }

    function test_executePayment_reverts_intervalNotElapsed() public {
        vm.prank(alice);
        rs.depositFunds{value: 10 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.expectRevert(Rootstream.IntervalNotElapsed.selector);
        rs.executePayment(id);
    }

    function test_executePayment_reverts_insufficientBalance() public {
        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.warp(block.timestamp + INTERVAL);

        vm.expectRevert(Rootstream.InsufficientBalance.selector);
        rs.executePayment(id);
    }

    function test_executePayment_success_anyCaller_transfersToRecipient() public {
        vm.prank(alice);
        rs.depositFunds{value: 10 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        uint256 bobBefore = bob.balance;
        vm.warp(block.timestamp + INTERVAL);

        vm.prank(gelato);
        vm.expectEmit(true, true, true, true);
        emit PaymentExecuted(id, alice, bob, AMOUNT, block.timestamp);
        rs.executePayment(id);

        assertEq(bob.balance, bobBefore + AMOUNT);
        assertEq(rs.balances(alice), 10 ether - AMOUNT);

        Rootstream.Stream memory s = rs.getStreamDetails(id);
        assertEq(s.lastExecuted, block.timestamp);
    }

    function test_executePayment_secondCallInSameInterval_reverts() public {
        vm.prank(alice);
        rs.depositFunds{value: 10 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.warp(block.timestamp + INTERVAL);
        vm.prank(gelato);
        rs.executePayment(id);

        vm.expectRevert(Rootstream.IntervalNotElapsed.selector);
        rs.executePayment(id);
    }

    function test_executePayment_afterNextInterval_twice() public {
        vm.prank(alice);
        rs.depositFunds{value: 10 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.warp(block.timestamp + INTERVAL);
        rs.executePayment(id);

        vm.warp(block.timestamp + INTERVAL);
        rs.executePayment(id);

        assertEq(rs.balances(alice), 10 ether - 2 * AMOUNT);
    }

    function test_executePayment_reverts_whenCancelled() public {
        vm.prank(alice);
        rs.depositFunds{value: 10 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.prank(alice);
        rs.cancelStream(id);

        vm.warp(block.timestamp + INTERVAL);
        vm.expectRevert(Rootstream.StreamNotActive.selector);
        rs.executePayment(id);
    }

    function test_cancelStream_onlySender() public {
        vm.prank(alice);
        rs.depositFunds{value: 1 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.prank(bob);
        vm.expectRevert(Rootstream.NotStreamSender.selector);
        rs.cancelStream(id);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit StreamCancelled(id, alice);
        rs.cancelStream(id);

        assertEq(rs.activeStreamCount(alice), 0);
        assertFalse(rs.getStreamDetails(id).active);
    }

    function test_cancelStream_doubleRevert() public {
        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.prank(alice);
        rs.cancelStream(id);

        vm.prank(alice);
        vm.expectRevert(Rootstream.StreamNotActive.selector);
        rs.cancelStream(id);
    }

    function test_withdrawRemainingBalance_afterAllCancelled() public {
        vm.prank(alice);
        rs.depositFunds{value: 5 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.prank(alice);
        rs.cancelStream(id);

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit FundsWithdrawn(alice, 5 ether, id);
        rs.withdrawRemainingBalance(id);

        assertEq(alice.balance, aliceBefore + 5 ether);
        assertEq(rs.balances(alice), 0);
    }

    function test_withdrawRemainingBalance_reverts_activeStreamsRemain() public {
        vm.prank(alice);
        rs.depositFunds{value: 10 ether}();

        vm.startPrank(alice);
        uint256 id1 = rs.createStream(bob, AMOUNT, INTERVAL);
        rs.createStream(bob, AMOUNT, INTERVAL);
        rs.cancelStream(id1);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert(Rootstream.ActiveStreamsRemain.selector);
        rs.withdrawRemainingBalance(id1);
    }

    function test_withdrawRemainingBalance_reverts_whileStreamStillActive() public {
        vm.prank(alice);
        rs.depositFunds{value: 5 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.prank(alice);
        vm.expectRevert(Rootstream.StreamNotActive.selector);
        rs.withdrawRemainingBalance(id);
    }

    function test_withdrawRemainingBalance_reverts_wrongOwner() public {
        vm.prank(alice);
        rs.depositFunds{value: 5 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.prank(alice);
        rs.cancelStream(id);

        vm.prank(bob);
        vm.expectRevert(Rootstream.NotStreamSender.selector);
        rs.withdrawRemainingBalance(id);
    }

    function test_withdrawRemainingBalance_reverts_zeroBalance() public {
        vm.prank(alice);
        uint256 id = rs.createStream(bob, AMOUNT, INTERVAL);

        vm.prank(alice);
        rs.cancelStream(id);

        vm.prank(alice);
        vm.expectRevert(Rootstream.ZeroAmount.selector);
        rs.withdrawRemainingBalance(id);
    }

    function test_getStreamDetails_reverts_unknown() public {
        vm.expectRevert(Rootstream.UnknownStream.selector);
        rs.getStreamDetails(42);
    }

    function test_executePayment_reverts_nativeTransferFailed() public {
        RejectingRecipient rejecter = new RejectingRecipient();

        vm.prank(alice);
        rs.depositFunds{value: 10 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(address(rejecter), AMOUNT, INTERVAL);

        vm.warp(block.timestamp + INTERVAL);
        vm.expectRevert(Rootstream.NativeTransferFailed.selector);
        rs.executePayment(id);
    }

    /// @dev Re-entrant `executePayment` hits the guard; the payout `.call` fails and the whole tx reverts (no double spend).
    function test_executePayment_reentrancy_blocked() public {
        ReentrantRecipient evil = new ReentrantRecipient(rs);

        vm.prank(alice);
        rs.depositFunds{value: 10 ether}();

        vm.prank(alice);
        uint256 id = rs.createStream(address(evil), AMOUNT, INTERVAL);
        evil.setStreamId(id);

        vm.warp(block.timestamp + INTERVAL);
        vm.expectRevert(Rootstream.NativeTransferFailed.selector);
        rs.executePayment(id);

        assertEq(rs.balances(alice), 10 ether);
    }

    function test_multipleStreams_perUser() public {
        vm.startPrank(alice);
        rs.depositFunds{value: 20 ether}();
        uint256 id1 = rs.createStream(bob, AMOUNT, INTERVAL);
        uint256 id2 = rs.createStream(bob, AMOUNT, INTERVAL);
        vm.stopPrank();

        assertEq(rs.activeStreamCount(alice), 2);
        uint256[] memory ids = rs.getUserStreams(alice);
        assertEq(ids.length, 2);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
    }
}
