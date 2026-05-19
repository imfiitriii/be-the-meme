# Mirror Match Green Line Fix - Bugfix Design

## Overview

The Mirror Match game has a critical bug where the green reference skeleton (locked pose) that shows the poser's frozen pose to the copier during the copying phase either moves/drifts or is not visible at all. This breaks the core gameplay mechanic, as the copier cannot see what pose they need to match.

The root cause is that when the lock timer expires, if `livePoserPoseRef.current` or `copierPoseAtLockRef.current` is null (due to temporary pose detection failures), the system sets `lockedPoseRef.current` and `displayLockedPoseRef.current` to null, causing the green skeleton to be invisible.

The fix will implement a fallback mechanism that preserves the last valid pose data during the locking phase and uses default positioning when the copier's pose is unavailable at lock time. This ensures the green reference skeleton is always visible and stays frozen throughout the copying phase.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the lock timer expires and either `livePoserPoseRef.current` or `copierPoseAtLockRef.current` is null, causing the green reference skeleton to be invisible or incorrectly positioned
- **Property (P)**: The desired behavior - the green reference skeleton should always be visible and frozen at a fixed position throughout the entire copying phase
- **Preservation**: Existing behaviors that must remain unchanged: live skeleton rendering during locking phase, match percentage calculation, temporal smoothing, result phase display, and round transitions
- **livePoserPoseRef**: A ref that stores the poser's current pose during the locking phase, updated every frame when a valid pose is detected
- **copierPoseAtLockRef**: A ref that stores the copier's pose at the moment the lock timer expires, used for one-time positioning of the green reference skeleton
- **lockedPoseRef**: A ref that stores the frozen poser's pose (raw coordinates) used for scoring during the copying phase
- **displayLockedPoseRef**: A ref that stores the locked pose shifted to the copier's side of the screen for rendering the green reference skeleton
- **buildDisplayLockedPose**: A function that shifts the locked poser skeleton onto the copier's side once (not every frame) by calculating the horizontal offset
- **Locking Phase**: The 5-second period where the poser strikes a pose while both players see their own skeletons
- **Copying Phase**: The 6-second period where the copier matches the frozen pose, seeing their live skeleton in yellow and the reference skeleton in green

## Bug Details

### Bug Condition

The bug manifests when the lock timer expires (transitions from locking phase to copying phase) and either the poser's pose or the copier's pose is null due to temporary pose detection failures. The system then sets `lockedPoseRef.current` and `displayLockedPoseRef.current` to null, causing the green reference skeleton to be invisible during the copying phase.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { lockTimerExpired: boolean, livePoserPose: Pose | null, copierPoseAtLock: Pose | null }
  OUTPUT: boolean
  
  RETURN input.lockTimerExpired == true
         AND (input.livePoserPose == null OR input.copierPoseAtLock == null)
         AND greenSkeletonNotVisible()
END FUNCTION
```

### Examples

- **Example 1**: Lock timer expires, `livePoserPoseRef.current` is null because pose detection temporarily failed in the last frame of the locking phase → `lockedPoseRef.current` is set to null → green skeleton is invisible during copying phase
- **Example 2**: Lock timer expires, `copierPoseAtLockRef.current` is null because the copier stepped out of frame momentarily → `buildDisplayLockedPose` receives null for copierPose → `displayLockedPoseRef.current` is set to null → green skeleton is invisible
- **Example 3**: During locking phase, pose detection works for 4 seconds, then fails in the last second → `livePoserPoseRef.current` is overwritten with null → when lock timer expires, no valid pose is captured → green skeleton is invisible
- **Edge case**: Both `livePoserPoseRef.current` and `copierPoseAtLockRef.current` are null at lock time → both fallback mechanisms should activate to ensure green skeleton is still visible with default positioning

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Both players must continue to see their own skeletons during the locking phase (poser in blue/red, copier in red/blue)
- The copier's live skeleton must continue to render in yellow during the copying phase
- Match percentage calculation must continue to use `comparePoses(lockedPoseRef.current, copierPose)` during the copying phase
- The green reference skeleton must continue to have the glow effect (green color with shadow blur)
- Round transitions must continue to reset all pose references to null
- Temporal smoothing must continue to apply to pose1 and pose2 but NOT to the frozen locked pose
- The result phase must continue to display the frozen green reference skeleton with reduced opacity (0.5)

**Scope:**
All inputs that do NOT involve the lock timer expiring with null pose data should be completely unaffected by this fix. This includes:
- Normal operation when both poses are detected at lock time
- Live skeleton rendering during locking and copying phases
- Match percentage calculation and display
- Round transitions and score updates
- Buffer countdown and phase transitions

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **No Fallback for Null Poser Pose**: When the lock timer expires, the code directly clones `livePoserPoseRef.current` without checking if it's null. If pose detection temporarily fails in the last frame of the locking phase, `livePoserPoseRef.current` will be null, causing `lockedPoseRef.current` to be null.
   - Location: `startLockPhase` function, line ~450: `lockedPoseRef.current = clonePose(livePoserPoseRef.current);`
   - The code updates `livePoserPoseRef.current` only when `poserPose` is valid, but doesn't preserve the last valid value

2. **No Fallback for Null Copier Pose**: The `buildDisplayLockedPose` function doesn't handle the case where `lockedPose` is null. If `lockedPoseRef.current` is null, the function returns null, causing `displayLockedPoseRef.current` to be null.
   - Location: `buildDisplayLockedPose` function, line ~135: `if (!lockedPose) return null;`

3. **Overwriting Valid Pose Data with Null**: During the locking phase, the code updates `livePoserPoseRef.current` and `copierPoseAtLockRef.current` only when valid poses are detected. However, if pose detection fails temporarily, these refs retain their previous values. The issue is that the refs are initialized to null at the start of each round, so if the first few frames have no detection, the refs remain null.
   - Location: Game loop, lines ~360-366

4. **No Default Positioning for Missing Copier Pose**: The `buildDisplayLockedPose` function has a fallback for `copierHipX` (uses 0.25 or 0.75 based on poser side), but this fallback is only used when `copierHipX` is null while `copierPose` is not null. If `copierPose` itself is null, the function returns null before reaching the fallback logic.

## Correctness Properties

Property 1: Bug Condition - Green Skeleton Always Visible

_For any_ lock timer expiration where either the poser's pose or copier's pose is null at lock time, the fixed code SHALL use the last valid poser pose detected during the locking phase and a default copier position to ensure the green reference skeleton is visible and frozen throughout the entire copying phase.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Existing Behavior Unchanged

_For any_ game state that does NOT involve null pose data at lock time (normal operation with both poses detected), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for skeleton rendering, match calculation, temporal smoothing, and phase transitions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/pages/MirrorMatch.jsx`

**Function**: `startLockPhase` (lines ~430-455)

**Specific Changes**:

1. **Add Last Valid Pose Tracking**: Introduce two new refs to track the last valid poses during the locking phase:
   - `lastValidPoserPoseRef`: Stores the most recent valid poser pose detected during locking
   - `lastValidCopierPoseRef`: Stores the most recent valid copier pose detected during locking
   - Initialize these refs in the component (alongside other refs)
   - Reset them to null at the start of each locking phase

2. **Update Pose Tracking in Game Loop**: Modify the locking phase section of the game loop (lines ~360-366) to update both the current pose refs AND the last valid pose refs:
   ```javascript
   if (phaseRef.current === "locking") {
       // Draw both skeletons so both players can see themselves
       drawSkeleton(ctx, poserPose,  canvas.width, canvas.height, poserColor,  true);
       drawSkeleton(ctx, copierPose, canvas.width, canvas.height, copierColor, true);

       // Store current poses AND track last valid poses
       if (poserPose) {
           livePoserPoseRef.current = poserPose;
           lastValidPoserPoseRef.current = poserPose;  // NEW: track last valid
       }
       if (copierPose) {
           copierPoseAtLockRef.current = copierPose;
           lastValidCopierPoseRef.current = copierPose;  // NEW: track last valid
       }
   }
   ```

3. **Add Fallback Logic at Lock Time**: Modify the lock timer expiration logic in `startLockPhase` (lines ~447-454) to use fallback values when current poses are null:
   ```javascript
   if (t <= 0) {
       clearInterval(lockTimerRef.current);
       
       // Use fallback: if current pose is null, use last valid pose
       const poseToLock = livePoserPoseRef.current || lastValidPoserPoseRef.current;
       const copierPoseForPositioning = copierPoseAtLockRef.current || lastValidCopierPoseRef.current;
       
       // Snapshot poser pose (deep copy so smoothing can't mutate it later)
       lockedPoseRef.current = clonePose(poseToLock);
       displayLockedPoseRef.current = buildDisplayLockedPose(
           lockedPoseRef.current,
           copierPoseForPositioning,
           isP1PoserRef.current
       );
       startCopyPhase();
   }
   ```

4. **Enhance buildDisplayLockedPose Function**: Modify the `buildDisplayLockedPose` function (lines ~135-143) to handle null `lockedPose` by returning a default pose or using a more robust fallback:
   ```javascript
   function buildDisplayLockedPose(lockedPose, copierPose, isP1Poser) {
       // If no locked pose at all, cannot display anything meaningful
       // This should not happen with the fallback logic above, but guard against it
       if (!lockedPose) return null;
       
       const lockedHipX = getHipX(lockedPose);
       const copierHipX = getHipX(copierPose);
       
       // Use default position if copier pose is unavailable
       const targetX = copierHipX !== null ? copierHipX : (isP1Poser ? 0.25 : 0.75);
       
       if (lockedHipX === null) return clonePose(lockedPose);
       return shiftPoseX(lockedPose, targetX - lockedHipX);
   }
   ```
   Note: The current implementation already has the copier fallback logic, so this change is minimal.

5. **Reset Last Valid Pose Refs on Round Transitions**: Update the round transition logic (lines ~500-510) to reset the new refs:
   ```javascript
   lockedPoseRef.current = null;
   displayLockedPoseRef.current = null;
   copierPoseAtLockRef.current = null;
   livePoserPoseRef.current = null;
   lastValidPoserPoseRef.current = null;  // NEW: reset
   lastValidCopierPoseRef.current = null;  // NEW: reset
   smoothedPctRef.current = 0;
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the lock timer expiring with null pose data. Mock the pose detection to return null at critical moments. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Null Poser Pose at Lock Time**: Simulate locking phase where pose detection works for 4 seconds, then returns null in the last second. Verify that `lockedPoseRef.current` is null after lock timer expires (will fail on unfixed code - green skeleton invisible).
2. **Null Copier Pose at Lock Time**: Simulate locking phase where copier pose is null when lock timer expires. Verify that `displayLockedPoseRef.current` is null (will fail on unfixed code - green skeleton invisible).
3. **Both Poses Null at Lock Time**: Simulate locking phase where both poses are null when lock timer expires. Verify that both `lockedPoseRef.current` and `displayLockedPoseRef.current` are null (will fail on unfixed code - green skeleton invisible).
4. **Intermittent Pose Detection Failures**: Simulate locking phase with intermittent pose detection failures (null, valid, null, valid pattern). Verify that the last valid pose is not preserved when lock timer expires with null (will fail on unfixed code).

**Expected Counterexamples**:
- Green skeleton is not rendered when `displayLockedPoseRef.current` is null
- Possible causes: no fallback for null poses at lock time, overwriting valid pose data with null, no preservation of last valid pose

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (null poses at lock time), the fixed function produces the expected behavior (green skeleton is visible and frozen).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := lockTimerExpiration_fixed(input)
  ASSERT displayLockedPoseRef.current IS NOT NULL
  ASSERT greenSkeletonIsVisible(result)
  ASSERT greenSkeletonIsFrozen(result)
END FOR
```

**Test Cases**:
1. **Null Poser Pose with Valid Last Pose**: Lock timer expires with null `livePoserPoseRef.current` but valid `lastValidPoserPoseRef.current`. Verify green skeleton is visible using the last valid pose.
2. **Null Copier Pose with Valid Last Pose**: Lock timer expires with null `copierPoseAtLockRef.current` but valid `lastValidCopierPoseRef.current`. Verify green skeleton is positioned correctly using the last valid copier pose.
3. **Both Poses Null with Valid Last Poses**: Lock timer expires with both current poses null but both last valid poses available. Verify green skeleton is visible and positioned correctly.
4. **Null Poser Pose with No Last Valid Pose**: Lock timer expires with null `livePoserPoseRef.current` and null `lastValidPoserPoseRef.current` (edge case - no detection during entire locking phase). Verify graceful handling (may still be null, but should not crash).

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (both poses detected at lock time), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT lockTimerExpiration_original(input) = lockTimerExpiration_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for normal operation (both poses detected), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Normal Lock Transition**: Observe that when both poses are detected at lock time, the green skeleton is visible and positioned correctly on unfixed code. Write test to verify this continues after fix.
2. **Live Skeleton Rendering**: Observe that during locking phase, both skeletons are rendered correctly on unfixed code. Write test to verify this continues after fix.
3. **Match Percentage Calculation**: Observe that during copying phase, match percentage is calculated correctly on unfixed code. Write test to verify this continues after fix.
4. **Temporal Smoothing**: Observe that temporal smoothing is applied to live poses but not to locked pose on unfixed code. Write test to verify this continues after fix.
5. **Round Transitions**: Observe that round transitions reset all pose refs correctly on unfixed code. Write test to verify this continues after fix.

### Unit Tests

- Test that `lastValidPoserPoseRef` and `lastValidCopierPoseRef` are updated correctly during locking phase when valid poses are detected
- Test that fallback logic uses last valid poses when current poses are null at lock time
- Test that `buildDisplayLockedPose` handles null `lockedPose` gracefully (returns null)
- Test that `buildDisplayLockedPose` uses default positioning when `copierPose` is null
- Test that round transitions reset all pose refs including new last valid pose refs

### Property-Based Tests

- Generate random sequences of pose detection results (valid/null patterns) during locking phase and verify that green skeleton is always visible after lock timer expires (as long as at least one valid pose was detected during locking)
- Generate random game states with various pose configurations and verify that match percentage calculation is unchanged
- Generate random round transitions and verify that all pose refs are reset correctly

### Integration Tests

- Test full game flow with simulated pose detection failures at various points during locking phase
- Test that green skeleton remains visible and frozen throughout entire copying phase even when pose detection fails at lock time
- Test that visual feedback (glow effect) is applied correctly to green skeleton after fix
- Test that copier can still see their live yellow skeleton and match percentage during copying phase after fix
