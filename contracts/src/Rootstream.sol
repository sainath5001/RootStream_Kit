// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Rootstream
/// @notice Prepaid recurring native-currency (RBTC on Rootstock) payment streams with optional automation-friendly execution.
/// @dev Uses a per-user balance; payments pull from the stream sender’s balance. Gelato or any EOA can call `executePayment`.
contract Rootstream {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ReentrancyGuardReentrantCall();
    error ZeroAddress();
    error ZeroAmount();
    error ZeroInterval();
    error UnknownStream();
    error NotStreamSender();
    error StreamNotActive();
    error IntervalNotElapsed();
    error InsufficientBalance();
    error ActiveStreamsRemain();
    error NativeTransferFailed();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

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

    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/

    struct Stream {
        address sender;
        address recipient;
        uint256 amountPerInterval;
        uint256 interval;
        uint256 lastExecuted;
        bool active;
    }

    /*//////////////////////////////////////////////////////////////
                            REENTRANCY GUARD
    //////////////////////////////////////////////////////////////*/

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _reentrancyStatus = _NOT_ENTERED;

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrancyGuardReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 private _nextStreamId = 1;

    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) private _userStreams;
    mapping(address => uint256) public balances;
    /// @notice Count of streams still marked active for a sender; withdrawal requires this to be zero.
    mapping(address => uint256) public activeStreamCount;

    /*//////////////////////////////////////////////////////////////
                            DEPOSIT / WITHDRAW
    //////////////////////////////////////////////////////////////*/

    /// @notice Credit RBTC/native to the caller’s prepaid balance.
    function depositFunds() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        uint256 newBal;
        unchecked {
            newBal = balances[msg.sender] + msg.value;
        }
        balances[msg.sender] = newBal;
        emit FundsDeposited(msg.sender, msg.value, newBal);
    }

    /// @notice After all of your streams are cancelled, withdraw remaining prepaid balance. `streamId` must be one of your cancelled streams (authorization hook).
    function withdrawRemainingBalance(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (s.sender == address(0)) revert UnknownStream();
        if (s.sender != msg.sender) revert NotStreamSender();
        if (s.active) revert StreamNotActive();
        if (activeStreamCount[msg.sender] != 0) revert ActiveStreamsRemain();

        uint256 amount = balances[msg.sender];
        if (amount == 0) revert ZeroAmount();

        balances[msg.sender] = 0;
        emit FundsWithdrawn(msg.sender, amount, streamId);

        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }

    /*//////////////////////////////////////////////////////////////
                                STREAMS
    //////////////////////////////////////////////////////////////*/

    /// @param recipient Receiver of each payment.
    /// @param amountPerInterval Native amount per period.
    /// @param interval Seconds between eligible executions.
    /// @return streamId New stream identifier.
    function createStream(address recipient, uint256 amountPerInterval, uint256 interval)
        external
        returns (uint256 streamId)
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (amountPerInterval == 0) revert ZeroAmount();
        if (interval == 0) revert ZeroInterval();

        streamId = _nextStreamId++;
        uint256 last = block.timestamp;

        streams[streamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            amountPerInterval: amountPerInterval,
            interval: interval,
            lastExecuted: last,
            active: true
        });

        _userStreams[msg.sender].push(streamId);
        unchecked {
            ++activeStreamCount[msg.sender];
        }

        emit StreamCreated(streamId, msg.sender, recipient, amountPerInterval, interval, last);
    }

    /// @notice Pull one interval payment if due and balance covers it. Callable by anyone (e.g. Gelato Web3 Function).
    function executePayment(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (s.sender == address(0)) revert UnknownStream();
        if (!s.active) revert StreamNotActive();

        unchecked {
            if (block.timestamp < s.lastExecuted + s.interval) revert IntervalNotElapsed();
        }

        address sender_ = s.sender;
        address recipient_ = s.recipient;
        uint256 amount = s.amountPerInterval;

        if (balances[sender_] < amount) revert InsufficientBalance();

        unchecked {
            s.lastExecuted = block.timestamp;
            balances[sender_] -= amount;
        }

        emit PaymentExecuted(streamId, sender_, recipient_, amount, block.timestamp);

        (bool ok,) = recipient_.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }

    /// @notice Stop future payments; only the stream sender may cancel.
    function cancelStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        if (s.sender == address(0)) revert UnknownStream();
        if (s.sender != msg.sender) revert NotStreamSender();
        if (!s.active) revert StreamNotActive();

        s.active = false;
        unchecked {
            --activeStreamCount[msg.sender];
        }

        emit StreamCancelled(streamId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                                VIEWS
    //////////////////////////////////////////////////////////////*/

    function getUserStreams(address user) external view returns (uint256[] memory) {
        return _userStreams[user];
    }

    function getStreamDetails(uint256 streamId) external view returns (Stream memory) {
        if (streams[streamId].sender == address(0)) revert UnknownStream();
        return streams[streamId];
    }

    function nextStreamId() external view returns (uint256) {
        return _nextStreamId;
    }

    /*//////////////////////////////////////////////////////////////
                            RECEIVE (OPTIONAL)
    //////////////////////////////////////////////////////////////*/

    /// @dev Same accounting as `depositFunds` for plain native transfers.
    receive() external payable {
        if (msg.value == 0) revert ZeroAmount();
        uint256 newBal;
        unchecked {
            newBal = balances[msg.sender] + msg.value;
        }
        balances[msg.sender] = newBal;
        emit FundsDeposited(msg.sender, msg.value, newBal);
    }
}
