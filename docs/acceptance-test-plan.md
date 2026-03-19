# Acceptance Test Plan

1. **Create Lobby**
   - Create lobby as guest and verify invite link is returned.
2. **Join Telegram + Non-Telegram**
   - Join from Telegram WebApp and standalone browser fallback.
3. **Start 12-player game**
   - Host starts game and verify private role reveal for all players.
4. **Night action order correctness**
   - Submit roleblock/investigate/lookout/protect/kill actions and assert emitted logs follow deterministic order.
5. **Day discussion + voice/chat**
   - Verify day timer runs and voice signaling events flow between peers.
6. **Majority lynch**
   - Confirm >50% living majority is required; verify tie policy behavior.
7. **Reconnect without leaks**
   - Disconnect/reload one player; on rejoin they recover state and only their secret role.
8. **Game finish + winner announcement**
   - Progress to terminal condition and validate winner event + audit history record.
9. **Cross-browser/mobile sweep**
   - Verify Chrome/Firefox/Edge/Safari desktop and mobile layout for controls and timers.
