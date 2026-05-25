// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CosmeticRegistry} from "./CosmeticRegistry.sol";

/// @title GameMatch — trustless one-shot match (max 4 players, 30 min) with richest-first bet (Option A).
contract GameMatch is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Phase {
        Lobby,
        Active,
        Ended
    }

    uint8 public constant MAX_PLAYERS = 4;
    uint8 public constant MIN_PLAYERS = 2;
    uint256 public constant MATCH_DURATION = 30 minutes;
    uint256 public constant TURN_TIMEOUT = 90 seconds;
    uint256 public constant STARTING_CASH = 1500;
    uint256 public constant GO_SALARY = 200;
    uint8 public constant BOARD_SIZE = 16;
    uint8 public constant PROPERTY_COUNT = 8;

    IERC20 public immutable chips;
    CosmeticRegistry public immutable registry;
    address public immutable treasury;
    address public immutable host;
    uint256 public immutable stakeAmount;
    uint16 public immutable feeBps;

    Phase public phase;
    uint8 public playerCount;
    uint8 public currentPlayerIndex;
    uint256 public turnNumber;
    uint256 public startedAt;
    uint256 public deadline;
    uint256 public lastActionAt;
    bool public betResolved;
    address public richestBetWinner;

    address[4] public players;
    mapping(address => bool) public isInMatch;

    struct PlayerState {
        uint256 cash;
        uint8 position;
        bool active;
        uint16 luckBps;
        bool inJail;
        uint8 jailTurns;
    }

    mapping(address => PlayerState) public playerState;
    mapping(uint8 propertyId => address owner) public propertyOwner;

    uint256 private _pot;

    error WrongPhase();
    error NotHost();
    error MatchFull();
    error AlreadyJoined();
    error NotInMatch();
    error NotEnoughPlayers();
    error TooManyPlayers();
    error NotYourTurn();
    error BetAlreadyResolved();
    error NoActivePlayers();
    error InvalidStake();
    error NoPropertyHere();
    error PropertyOwned();
    error NotPropertyOwner();
    error InsufficientCash();
    error ActionTimeoutNotReached();

    event PlayerJoined(address indexed player, uint8 index, uint16 luckBps);
    event MatchStarted(uint256 deadline);
    event DiceRolled(address indexed player, uint8 die1, uint8 die2, uint8 newPosition);
    event PaidRent(address indexed payer, address indexed receiver, uint8 propertyId, uint256 amount);
    event PropertyBought(address indexed buyer, uint8 propertyId, uint256 price);
    event Bankrupt(address indexed player);
    event RichestBetPaid(address indexed winner, uint256 payout, uint256 treasuryFee);
    event TurnEnded(address indexed nextPlayer);
    event TurnSkipped(address indexed player);
    event MatchEnded(address indexed boardWinner, string reason);

    constructor(
        address chips_,
        address registry_,
        address treasury_,
        uint16 feeBps_,
        uint256 stakeAmount_,
        address host_
    ) {
        if (stakeAmount_ == 0) revert InvalidStake();
        chips = IERC20(chips_);
        registry = CosmeticRegistry(registry_);
        treasury = treasury_;
        feeBps = feeBps_;
        stakeAmount = stakeAmount_;
        host = host_;
        phase = Phase.Lobby;
    }

  // ─── Lobby ───────────────────────────────────────────────────────────────

    function joinMatch(uint256[] calldata outfitTokenIds) external nonReentrant {
        if (phase != Phase.Lobby) revert WrongPhase();
        if (isInMatch[msg.sender]) revert AlreadyJoined();
        if (playerCount >= MAX_PLAYERS) revert MatchFull();
        _join(msg.sender, outfitTokenIds);
    }

    function _join(address player, uint256[] memory outfitTokenIds) internal {
        uint16 luck = 0;
        if (outfitTokenIds.length > 0) {
            luck = registry.resolveLuckBps(player, outfitTokenIds);
        }

        chips.transferFrom(player, address(this), stakeAmount);
        _pot += stakeAmount;

        players[playerCount] = player;
        isInMatch[player] = true;
        playerState[player] = PlayerState({
            cash: STARTING_CASH,
            position: 0,
            active: true,
            luckBps: luck,
            inJail: false,
            jailTurns: 0
        });

        emit PlayerJoined(player, playerCount, luck);
        playerCount++;
    }

    function startMatch() external {
        if (phase != Phase.Lobby) revert WrongPhase();
        if (msg.sender != host) revert NotHost();
        if (playerCount < MIN_PLAYERS) revert NotEnoughPlayers();

        phase = Phase.Active;
        startedAt = block.timestamp;
        deadline = startedAt + MATCH_DURATION;
        lastActionAt = block.timestamp;
        currentPlayerIndex = 0;
        turnNumber = 1;

        emit MatchStarted(deadline);
    }

  // ─── Gameplay ────────────────────────────────────────────────────────────

    function rollAndMove() external nonReentrant {
        _requireActiveTurn(msg.sender);

        PlayerState storage ps = playerState[msg.sender];

        if (ps.inJail) {
            _handleJailTurn(msg.sender, ps);
            _afterAction();
            return;
        }

        (uint8 die1, uint8 die2) = _rollDice();
        uint8 steps = die1 + die2;
        uint8 oldPos = ps.position;
        uint256 raw = uint256(oldPos) + uint256(steps);
        if (raw >= BOARD_SIZE) {
            ps.cash += GO_SALARY;
        }
        uint8 newPos = uint8(raw % BOARD_SIZE);
        ps.position = newPos;

        emit DiceRolled(msg.sender, die1, die2, newPos);
        _handleLanding(msg.sender, newPos);
        _checkRichestFirst();
        _afterAction();
    }

    function buyProperty() external nonReentrant {
        _requireActiveTurn(msg.sender);
        int8 propId = _propertyAt(playerState[msg.sender].position);
        if (propId < 0) revert NoPropertyHere();
        uint8 pid = uint8(propId);
        if (propertyOwner[pid] != address(0)) revert PropertyOwned();

        uint256 price = _propertyPrice(pid);
        PlayerState storage ps = playerState[msg.sender];
        if (ps.cash < price) revert InsufficientCash();

        ps.cash -= price;
        propertyOwner[pid] = msg.sender;
        emit PropertyBought(msg.sender, pid, price);
        _checkRichestFirst();
        _afterAction();
    }

    function endTurn() external {
        _requireActiveTurn(msg.sender);
        _advanceTurn();
    }

    function skipTurn() external {
        if (phase != Phase.Active) revert WrongPhase();
        if (block.timestamp < lastActionAt + TURN_TIMEOUT) revert ActionTimeoutNotReached();
        address current = players[currentPlayerIndex];
        emit TurnSkipped(current);
        _advanceTurn();
    }

    function endByTimeout() external nonReentrant {
        if (phase != Phase.Active) revert WrongPhase();
        if (block.timestamp < deadline) revert WrongPhase();
        _finishMatch("timeout");
    }

  // ─── Views ───────────────────────────────────────────────────────────────

    function netWorth(address player) public view returns (uint256) {
        PlayerState memory ps = playerState[player];
        if (!ps.active) return 0;
        uint256 total = ps.cash;
        for (uint8 i = 0; i < PROPERTY_COUNT; i++) {
            if (propertyOwner[i] == player) {
                total += _propertyMortgageValue(i);
            }
        }
        return total;
    }

    function lowestActiveNetWorth() public view returns (uint256) {
        uint256 lowest = type(uint256).max;
        bool found;
        for (uint8 i = 0; i < playerCount; i++) {
            address p = players[i];
            PlayerState memory ps = playerState[p];
            if (!ps.active) continue;
            uint256 w = netWorth(p);
            if (w < lowest) lowest = w;
            found = true;
        }
        if (!found) revert NoActivePlayers();
        return lowest;
    }

    function potSize() external view returns (uint256) {
        return _pot;
    }

  // ─── Internals ───────────────────────────────────────────────────────────

    function _requireActiveTurn(address player) internal view {
        if (phase != Phase.Active) revert WrongPhase();
        if (!isInMatch[player] || !playerState[player].active) revert NotInMatch();
        if (players[currentPlayerIndex] != player) revert NotYourTurn();
    }

    function _afterAction() internal {
        lastActionAt = block.timestamp;
        if (block.timestamp >= deadline) {
            _finishMatch("deadline_on_action");
        }
        if (_activePlayerCount() <= 1) {
            _finishMatch("last_player");
        }
    }

    function _advanceTurn() internal {
        lastActionAt = block.timestamp;
        uint8 tries;
        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % playerCount;
            tries++;
        } while (!playerState[players[currentPlayerIndex]].active && tries <= playerCount);

        if (!playerState[players[currentPlayerIndex]].active) {
            _finishMatch("no_active_turn");
            return;
        }

        turnNumber++;
        emit TurnEnded(players[currentPlayerIndex]);
    }

    function _rollDice() internal view returns (uint8 die1, uint8 die2) {
        uint256 rand =
            uint256(keccak256(abi.encodePacked(block.prevrandao, address(this), turnNumber, currentPlayerIndex)));
        die1 = uint8(1 + rand % 6);
        die2 = uint8(1 + (rand >> 8) % 6);
    }

    function _handleJailTurn(address player, PlayerState storage ps) internal {
        (uint8 d1, uint8 d2) = _rollDice();
        emit DiceRolled(player, d1, d2, ps.position);
        if (d1 == d2) {
            ps.inJail = false;
            ps.jailTurns = 0;
            uint8 steps = d1 + d2;
            ps.position = (ps.position + steps) % BOARD_SIZE;
            _handleLanding(player, ps.position);
        } else {
            ps.jailTurns++;
            if (ps.jailTurns >= 3) {
                ps.cash -= 50;
                ps.inJail = false;
                ps.jailTurns = 0;
            }
        }
    }

    function _handleLanding(address player, uint8 position) internal {
        if (position == 0) return;

        if (position == 6) {
            playerState[player].inJail = true;
            playerState[player].jailTurns = 0;
            return;
        }

        if (position == 2 || position == 8 || position == 13) {
            _debit(player, _taxAt(position));
            return;
        }

        if (position == 4 || position == 9) {
            _chanceCard(player);
            return;
        }

        int8 propId = _propertyAt(position);
        if (propId < 0) return;

        uint8 pid = uint8(propId);
        address owner = propertyOwner[pid];
        if (owner == address(0)) return;
        if (owner == player) return;

        uint256 rent = _propertyRent(pid);
        _transferCash(player, owner, rent);
        emit PaidRent(player, owner, pid, rent);
    }

    function _chanceCard(address player) internal {
        PlayerState storage ps = playerState[player];
        uint256 rand = uint256(keccak256(abi.encodePacked(block.prevrandao, player, turnNumber, "chance")));
        uint256 bias = 500 + ps.luckBps;
        if (rand % 1000 < bias) {
            uint256 gain = 50 + (rand % 150);
            ps.cash += gain;
        } else {
            uint256 loss = 25 + (rand % 100);
            _debit(player, loss);
        }
    }

    function _checkRichestFirst() internal {
        if (betResolved || phase != Phase.Active) return;
        if (turnNumber < 2) return;

        uint256 lowest = lowestActiveNetWorth();
        if (lowest == 0) return;

        for (uint8 i = 0; i < playerCount; i++) {
            address p = players[i];
            if (!playerState[p].active) continue;
            if (netWorth(p) >= lowest * 2) {
                _resolveRichestBet(p);
                return;
            }
        }
    }

    function _resolveRichestBet(address winner) internal {
        if (betResolved) return;
        betResolved = true;
        richestBetWinner = winner;

        uint256 fee = (_pot * feeBps) / 10_000;
        uint256 payout = _pot - fee;
        _pot = 0;

        if (fee > 0) chips.safeTransfer(treasury, fee);
        chips.safeTransfer(winner, payout);

        emit RichestBetPaid(winner, payout, fee);
    }

    function _finishMatch(string memory reason) internal {
        if (phase == Phase.Ended) return;
        phase = Phase.Ended;

        address boardWinner = _boardWinner();
        if (!betResolved && _pot > 0) {
            uint256 fee = (_pot * feeBps) / 10_000;
            uint256 payout = _pot - fee;
            _pot = 0;
            if (fee > 0) chips.safeTransfer(treasury, fee);
            if (boardWinner != address(0)) chips.safeTransfer(boardWinner, payout);
        }

        emit MatchEnded(boardWinner, reason);
    }

    function _boardWinner() internal view returns (address) {
        address winner;
        uint256 best;
        for (uint8 i = 0; i < playerCount; i++) {
            address p = players[i];
            if (!playerState[p].active) continue;
            uint256 w = netWorth(p);
            if (w > best) {
                best = w;
                winner = p;
            }
        }
        return winner;
    }

    function _activePlayerCount() internal view returns (uint8 count) {
        for (uint8 i = 0; i < playerCount; i++) {
            if (playerState[players[i]].active) count++;
        }
    }

    function _transferCash(address from, address to, uint256 amount) internal {
        PlayerState storage payer = playerState[from];
        if (payer.cash < amount) {
            _bankrupt(from);
            return;
        }
        payer.cash -= amount;
        playerState[to].cash += amount;
    }

    function _debit(address player, uint256 amount) internal {
        PlayerState storage ps = playerState[player];
        if (ps.cash < amount) {
            _bankrupt(player);
            return;
        }
        ps.cash -= amount;
    }

    function _bankrupt(address player) internal {
        PlayerState storage ps = playerState[player];
        if (!ps.active) return;
        ps.active = false;
        ps.cash = 0;
        for (uint8 i = 0; i < PROPERTY_COUNT; i++) {
            if (propertyOwner[i] == player) propertyOwner[i] = address(0);
        }
        emit Bankrupt(player);
    }

    function _propertyAt(uint8 position) internal pure returns (int8) {
        if (position == 1) return 0;
        if (position == 3) return 1;
        if (position == 5) return 2;
        if (position == 7) return 3;
        if (position == 10) return 4;
        if (position == 11) return 5;
        if (position == 12) return 6;
        if (position == 14) return 7;
        return -1;
    }

    function _propertyPrice(uint8 propertyId) internal pure returns (uint256) {
        uint256[8] memory prices = [uint256(120), 120, 200, 200, 280, 280, 350, 400];
        return prices[propertyId];
    }

    function _propertyRent(uint8 propertyId) internal pure returns (uint256) {
        uint256[8] memory rents = [uint256(12), 12, 20, 20, 28, 28, 35, 40];
        return rents[propertyId];
    }

    function _propertyMortgageValue(uint8 propertyId) internal pure returns (uint256) {
        return _propertyPrice(propertyId) / 2;
    }

    function _taxAt(uint8 position) internal pure returns (uint256) {
        if (position == 2) return 75;
        if (position == 8) return 100;
        if (position == 13) return 125;
        return 50;
    }
}
