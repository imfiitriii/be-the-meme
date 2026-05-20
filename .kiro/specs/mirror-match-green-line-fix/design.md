# Mirror Match Green Line Fix - Bugfix Design

## Overview

The Mirror Match game has three critical bugs affecting the green reference skeleton (locked pose) during the copying phase:

**Bug 1 (Primary): Green Skeleton Teleports**
The `buildDisplayLockedPose` function shifts the locked pose to the copier's side of the screen, causing the green skeleton to "teleport" from where the poser originally struck the pose to where the copier is standing. This fundamentally breaks the gameplay because during the locking phase, both skeletons are visible at their original positions, but when the timer expires, the green skeleton jumps to the copier's position instead of staying where the poser was.

**Bug 2 (Secondary): Visibility Issues**
When the lock timer expires, if `livePoserPoseRef.current` is null (due to temporary pose detection failures), the system sets `lockedPoseRef.current` to null, causing the green skeleton to be invisible.

**Bug 3: Locking Phase Shows Both Skeletons**
During the locking phase, both skeletons (poser and copier) are visible, but only the poser's skeleton should be shown to avoid distraction.

The fix will:
1. **Remove the pose shifting logic** - Keep the green skeleton at the poser's ORIGINAL position (don't call `buildDisplayLockedPose` or `shiftPoseX`)
2. **Implement last valid pose tracking** - Preserve the last valid pose data during the locking phase to ensure visibility
3. **Show only the poser's skeleton during locking** - Hide the copier's skeleton during the locking phase

## Glossary

- **Bug_Condition (C)**: Three conditions that trigger bugs: (1) `buildDisplayLockedPose` shifts the locked pose causing teleportation, (2) lock timer expires with null `livePoserPoseRef.current` causing invisibility, (3) both skeletons visible during locking phase
- **Property (P)**: The desired behavior - the green reference skeleton should stay at the poser's ORIGINAL position (no shifting), always be visible, and only the poser's skeleton should be visible during locking
- **Preservation**: Existing behaviors that must remain unchanged: match percentage calculation, temporal smoothing, result phase display, round transitions, and buffer phase display
- **livePoserPoseRef**: A ref that stores the poser's current pose during the locking phase, updated every frame when a valid pose is detected
- **lockedPoseRef**: A ref that stores the frozen poser's pose at its ORIGINAL position (raw coordinates) used for both scoring and rendering during the copying phase
- **displayLockedPoseRef**: (TO BE REMOVED) Previously stored the shifted locked pose, but this causes the teleporting bug
- **buildDisplayLockedPose**: (TO BE REMOVED) Function that shifts the locked pose to the copier's side - this is the root cause of the teleporting bug
- **shiftPoseX**: (TO BE REMOVED from this workflow) Function that shifts a pose horizontally - should not be used for the locked pose
- **Locking Phase**: The 5-second period where the poser strikes a pose while ONLY the poser's skeleton is visible
- **Copying Phase**: The 6-second period where the copier matches the frozen pose, seeing their live skeleton in yellow and the reference skeleton in green at the poser's ORIGINAL position

## Bug Details

### Bug Condition

**Bug 1: Teleporting Green Skeleton (Primary)**

The bug manifests when the lock timer expires and transitions to the copying phase. The `buildDisplayLockedPose` function shifts the locked pose from the poser's original position to the copier's side of the screen using `shiftPoseX(lockedPose, targetX - lockedHipX)`. This causes the green skeleton to "teleport" from where the poser struck the pose to where the copier is standing, making it impossible to see the original pose location.

**Formal Specification:**
```
FUNCTION isBugCondition_Teleport(input)
  INPUT: input of type { lockTimerExpired: boolean, lockedPose: Pose, copierPose: Pose }
  OUTPUT: boolean
  
  RETURN input.lockTimerExpired == true
         AND buildDisplayLockedPose_called(input.lockedPose, input.copierPose)
         AND greenSkeletonPosition != poserOriginalPosition
END FUNCTION
```

**Bug 2: Invisible Green Skeleton (Secondary)**

The bug manifests when the lock timer expires and `livePoserPoseRef.current` is null due to temporary pose detection failures. The system then sets `lockedPoseRef.current` to null, causing the green reference skeleton to be invisible during the copying phase.

**Formal Specification:**
```
FUNCTION isBugCondition_Invisible(input)
  INPUT: input of type { lockTimerExpired: boolean, livePoserPose: Pose | null }
  OUTPUT: boolean
  
  RETURN input.lockTimerExpired == true
         AND input.livePoserPose == null
         AND greenSkeletonNotVisible()
END FUNCTION
```

**Bug 3: Both Skeletons Visible During Locking**

The bug manifests during the locking phase when both the poser's and copier's skeletons are rendered, causing distraction. Only the poser's skeleton should be visible during this phase.

**Formal Specification:**
```
FUNCTION isBugCondition_LockingVisibility(input)
  INPUT: input of type { phase: string, poserSkeletonVisible: boolean, copierSkeletonVisible: boolean }
  OUTPUT: boolean
  
  RETURN input.phase == "locking"
         AND input.poserSkeletonVisible == true
         AND input.copierSkeletonVisible == true
END FUNCTION
```

### Examples

**Bug 1 Examples:**
- **Example 1**: Poser (P1) strikes a pose on the left side at hip X = 0.7. Lock timer expires. `buildDisplayLockedPose` shifts the pose to copier's position at X = 0.3. Green skeleton "teleports" from left to right side of screen.
- **Example 2**: During locking, both skeletons are visible at their original positions (blue at X = 0.7, red at X = 0.3). When timer expires, green skeleton appears at X = 0.3 instead of staying at X = 0.7 where the poser was.
- **Example 3**: Copier tries to match the pose but sees the green skeleton at their own location instead of at the poser's original location, making it impossible to judge the correct position.

**Bug 2 Examples:**
- **Example 4**: Lock timer expires, `livePoserPoseRef.current` is null because pose detection temporarily failed in the last frame → `lockedPoseRef.current` is set to null → green skeleton is invisible during copying phase
- **Example 5**: During locking phase, pose detection works for 4 seconds, then fails in the last second → `livePoserPoseRef.current` is overwritten with null → when lock timer expires, no valid pose is captured → green skeleton is invisible

**Bug 3 Examples:**
- **Example 6**: During the 5-second locking phase, both the poser's skeleton (blue) and copier's skeleton (red) are visible, causing distraction for the poser who should focus on striking a pose.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The copier's live skeleton must continue to render in yellow during the copying phase
- Match percentage calculation must continue to use `comparePoses(lockedPoseRef.current, copierPose)` during the copying phase
- The green reference skeleton must continue to have the glow effect (green color with shadow blur)
- Round transitions must continue to reset all pose references to null
- Temporal smoothing must continue to apply to pose1 and pose2 but NOT to the frozen locked pose
- The result phase must continue to display the frozen green reference skeleton with reduced opacity (0.5)
- The buffer phase must continue to show both players' live skeletons with reduced opacity so they can position themselves
- Pose splitting must continue to use `splitPoses` to separate Player 1 (visual left, hip X > 0.5) from Player 2 (visual right, hip X <= 0.5)

**Scope:**
All inputs that do NOT involve the three bug conditions (pose shifting, null pose data at lock time, both skeletons during locking) should be completely unaffected by this fix. This includes:
- Normal operation when poses are detected at lock time
- Live skeleton rendering during copying phase
- Match percentage calculation and display
- Round transitions and score updates
- Buffer countdown and phase transitions
- Result phase display

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

**Bug 1: Teleporting Green Skeleton (Primary)**

1. **Incorrect Design Decision**: The `buildDisplayLockedPose` function (lines ~135-143) was designed to shift the locked pose to the copier's side of the screen. This is fundamentally wrong because:
   - During the locking phase, both skeletons are visible at their original positions
   - When the timer expires, the green skeleton should stay exactly where the poser was
   - Shifting it to the copier's position creates a jarring "teleport" effect
   - The copier cannot see where the pose was originally struck

2. **Pose Shifting Logic**: The function uses `shiftPoseX(lockedPose, targetX - lockedHipX)` to move the skeleton horizontally, which is the direct cause of the teleportation.

**Bug 2: Invisible Green Skeleton (Secondary)**

1. **No Fallback for Null Poser Pose**: When the lock timer expires (line ~450), the code directly clones `livePoserPoseRef.current` without checking if it's null. If pose detection temporarily fails in the last frame of the locking phase, `livePoserPoseRef.current` will be null, causing `lockedPoseRef.current` to be null.
   - Location: `startLockPhase` function, line ~450: `lockedPoseRef.current = clonePose(livePoserPoseRef.current);`
   - The code updates `livePoserPoseRef.current` only when `poserPose` is valid, but doesn't preserve the last valid value

2. **Overwriting Valid Pose Data with Null**: During the locking phase (lines ~360-366), the code updates `livePoserPoseRef.current` only when valid poses are detected. However, if pose detection fails temporarily, these refs retain their previous values. The issue is that the refs are initialized to null at the start of each round, so if the first few frames have no detection, the refs remain null.

**Bug 3: Both Skeletons Visible During Locking**

1. **Incorrect Rendering Logic**: During the locking phase (lines ~360-362), the code renders both the poser's and copier's skeletons:
   ```javascript
   drawSkeleton(ctx, poserPose,  canvas.width, canvas.height, poserColor,  true);
   drawSkeleton(ctx, copierPose, canvas.width, canvas.height, copierColor, true);
   ```
   Only the poser's skeleton should be visible during this phase to avoid distraction.

## Correctness Properties

Property 1: Bug Condition - Green Skeleton at Original Position

_For any_ lock timer expiration, the fixed code SHALL keep the green reference skeleton at the poser's ORIGINAL position (no horizontal shifting), ensuring the copier can see exactly where the pose was struck.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Bug Condition - Green Skeleton Always Visible

_For any_ lock timer expiration where the poser's pose is null at lock time, the fixed code SHALL use the last valid poser pose detected during the locking phase to ensure the green reference skeleton is visible and frozen throughout the entire copying phase.

**Validates: Requirements 2.5, 2.6, 2.7, 2.8, 2.9**

Property 3: Bug Condition - Only Poser Visible During Locking

_For any_ frame during the locking phase, the fixed code SHALL render ONLY the poser's skeleton (not the copier's skeleton), allowing the poser to focus on striking a pose without distraction.

**Validates: Requirements 2.10**

Property 4: Preservation - Existing Behavior Unchanged

_For any_ game state that does NOT involve the three bug conditions (pose shifting, null pose data at lock time, both skeletons during locking), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for skeleton rendering, match calculation, temporal smoothing, and phase transitions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

## Fix Implementation

### Changes Required

**File**: `src/pages/MirrorMatch.jsx`

**Change 1: Remove Pose Shifting Logic (Bug 1 Fix - Primary)**

**Location**: Lines ~450-454 in `startLockPhase` function

**Current Code**:
```javascript
lockedPoseRef.current = clonePose(livePoserPoseRef.current);
displayLockedPoseRef.current = buildDisplayLockedPose(
    lockedPoseRef.current,
    copierPoseAtLockRef.current,
    isP1PoserRef.current
);
```

**Fixed Code**:
```javascript
// Use fallback: if current pose is null, use last valid pose
const poseToLock = livePoserPoseRef.current || lastValidPoserPoseRef.current;

// Snapshot poser pose at ORIGINAL position (deep copy so smoothing can't mutate it later)
lockedPoseRef.current = clonePose(poseToLock);

// DO NOT shift the pose - keep it at the original position
// displayLockedPoseRef is no longer needed - we'll render lockedPoseRef directly
```

**Rationale**: The `buildDisplayLockedPose` function shifts the locked pose to the copier's side, causing the teleporting bug. By removing this call and keeping the pose at its original position, the green skeleton will stay exactly where the poser struck the pose.

---

**Change 2: Add Last Valid Pose Tracking (Bug 2 Fix - Secondary)**

**Location**: Component refs initialization (around line ~230)

**Add New Refs**:
```javascript
const lastValidPoserPoseRef = useRef(null);
```

**Location**: Game loop locking phase section (lines ~360-366)

**Current Code**:
```javascript
if (phaseRef.current === "locking") {
    // Draw both skeletons so both players can see themselves
    drawSkeleton(ctx, poserPose,  canvas.width, canvas.height, poserColor,  true);
    drawSkeleton(ctx, copierPose, canvas.width, canvas.height, copierColor, true);

    // Only store when we have a valid detection — never overwrite with null
    if (poserPose) {
        livePoserPoseRef.current = poserPose;
    }
    if (copierPose) {
        copierPoseAtLockRef.current = copierPose;
    }
}
```

**Fixed Code**:
```javascript
if (phaseRef.current === "locking") {
    // Draw ONLY the poser's skeleton (Bug 3 fix)
    drawSkeleton(ctx, poserPose,  canvas.width, canvas.height, poserColor,  true);

    // Store current pose AND track last valid pose (Bug 2 fix)
    if (poserPose) {
        livePoserPoseRef.current = poserPose;
        lastValidPoserPoseRef.current = poserPose;  // Track last valid
    }
}
```

**Rationale**: By tracking the last valid pose, we ensure that even if pose detection fails at the lock moment, we have a fallback pose to display. Also fixes Bug 3 by only rendering the poser's skeleton.

---

**Change 3: Update Copying Phase Rendering (Bug 1 Fix - Primary)**

**Location**: Game loop copying phase section (lines ~368-375)

**Current Code**:
```javascript
} else if (phaseRef.current === "copying") {
    // Draw live copier skeleton (yellow)
    drawSkeleton(ctx, copierPose, canvas.width, canvas.height, "rgba(251,188,4,0.85)", true);
    // Draw frozen reference skeleton (green) — position fixed at lock time
    drawSkeleton(ctx, displayLockedPoseRef.current, canvas.width, canvas.height, "rgba(52,168,83,0.95)", true, true);

    const rawPct = comparePoses(lockedPoseRef.current, copierPose) * 100;
    smoothedPctRef.current = smoothedPctRef.current * 0.7 + rawPct * 0.3;
    setMatchPct(Math.round(smoothedPctRef.current));
}
```

**Fixed Code**:
```javascript
} else if (phaseRef.current === "copying") {
    // Draw live copier skeleton (yellow)
    drawSkeleton(ctx, copierPose, canvas.width, canvas.height, "rgba(251,188,4,0.85)", true);
    // Draw frozen reference skeleton (green) at ORIGINAL position (no shifting)
    drawSkeleton(ctx, lockedPoseRef.current, canvas.width, canvas.height, "rgba(52,168,83,0.95)", true, true);

    const rawPct = comparePoses(lockedPoseRef.current, copierPose) * 100;
    smoothedPctRef.current = smoothedPctRef.current * 0.7 + rawPct * 0.3;
    setMatchPct(Math.round(smoothedPctRef.current));
}
```

**Rationale**: Render `lockedPoseRef.current` directly instead of `displayLockedPoseRef.current`, keeping the green skeleton at the poser's original position.

---

**Change 4: Update Result Phase Rendering (Bug 1 Fix - Primary)**

**Location**: Game loop result phase section (lines ~376-378)

**Current Code**:
```javascript
} else if (phaseRef.current === "result") {
    drawSkeleton(ctx, displayLockedPoseRef.current, canvas.width, canvas.height, "rgba(52,168,83,0.5)", true, true);
}
```

**Fixed Code**:
```javascript
} else if (phaseRef.current === "result") {
    drawSkeleton(ctx, lockedPoseRef.current, canvas.width, canvas.height, "rgba(52,168,83,0.5)", true, true);
}
```

**Rationale**: Render `lockedPoseRef.current` directly instead of `displayLockedPoseRef.current`.

---

**Change 5: Update Round Transitions (Cleanup)**

**Location**: Round transition logic (lines ~500-510)

**Current Code**:
```javascript
lockedPoseRef.current = null;
displayLockedPoseRef.current = null;
copierPoseAtLockRef.current = null;
livePoserPoseRef.current = null;
smoothedPctRef.current = 0;
```

**Fixed Code**:
```javascript
lockedPoseRef.current = null;
// displayLockedPoseRef is no longer used
livePoserPoseRef.current = null;
lastValidPoserPoseRef.current = null;  // Reset last valid pose
smoothedPctRef.current = 0;
```

**Rationale**: Remove references to `displayLockedPoseRef` and `copierPoseAtLockRef` since they're no longer needed. Add reset for `lastValidPoserPoseRef`.

---

**Change 6: Remove Unused Functions (Cleanup)**

**Location**: Lines ~135-143

**Remove**:
- `buildDisplayLockedPose` function (no longer needed)
- `displayLockedPoseRef` ref declaration (no longer needed)
- `copierPoseAtLockRef` ref declaration (no longer needed)

**Rationale**: These are no longer used after removing the pose shifting logic.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the three bug conditions: (1) pose shifting causing teleportation, (2) null pose data at lock time, (3) both skeletons visible during locking. Run these tests on the UNFIXED code to observe failures and understand the root causes.

**Test Cases**:

**Bug 1: Teleporting Green Skeleton**
1. **Pose Shift Detection**: Simulate locking phase where poser is at hip X = 0.7, copier at X = 0.3. When lock timer expires, verify that `buildDisplayLockedPose` is called and shifts the pose from 0.7 to 0.3 (will fail on unfixed code - demonstrates teleportation).
2. **Visual Position Mismatch**: During locking, record poser's skeleton position. After lock, verify green skeleton position matches the recorded position (will fail on unfixed code - green skeleton moves).
3. **Copier Confusion**: Simulate copier trying to match pose. Verify that green skeleton is NOT at copier's own position (will fail on unfixed code - green skeleton is at copier's position).

**Bug 2: Invisible Green Skeleton**
4. **Null Poser Pose at Lock Time**: Simulate locking phase where pose detection works for 4 seconds, then returns null in the last second. Verify that `lockedPoseRef.current` is null after lock timer expires (will fail on unfixed code - green skeleton invisible).
5. **No Last Valid Pose Tracking**: Verify that when pose detection fails, the last valid pose is NOT preserved (will fail on unfixed code - no fallback mechanism).

**Bug 3: Both Skeletons During Locking**
6. **Copier Skeleton Visible**: During locking phase, verify that both poser's and copier's skeletons are rendered (will fail on unfixed code - both visible when only poser should be).

**Expected Counterexamples**:
- Green skeleton position changes from poser's original position to copier's position (Bug 1)
- Green skeleton is not rendered when `lockedPoseRef.current` is null (Bug 2)
- Both skeletons are visible during locking phase (Bug 3)
- Possible causes: pose shifting logic, no fallback for null poses, incorrect rendering logic

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed functions produce the expected behavior.

**Bug 1 Fix Checking:**
```
FOR ALL input WHERE isBugCondition_Teleport(input) DO
  result := lockTimerExpiration_fixed(input)
  ASSERT greenSkeletonPosition == poserOriginalPosition
  ASSERT buildDisplayLockedPose_NOT_called()
  ASSERT lockedPoseRef.current rendered directly
END FOR
```

**Bug 2 Fix Checking:**
```
FOR ALL input WHERE isBugCondition_Invisible(input) DO
  result := lockTimerExpiration_fixed(input)
  ASSERT lockedPoseRef.current IS NOT NULL
  ASSERT greenSkeletonIsVisible(result)
  ASSERT lastValidPoserPose used as fallback
END FOR
```

**Bug 3 Fix Checking:**
```
FOR ALL input WHERE isBugCondition_LockingVisibility(input) DO
  result := lockingPhaseRendering_fixed(input)
  ASSERT poserSkeletonVisible == true
  ASSERT copierSkeletonVisible == false
END FOR
```

**Test Cases**:
1. **No Pose Shifting**: Lock timer expires with valid poses. Verify green skeleton stays at poser's original position (not shifted to copier's side).
2. **Null Poser Pose with Valid Last Pose**: Lock timer expires with null `livePoserPoseRef.current` but valid `lastValidPoserPoseRef.current`. Verify green skeleton is visible using the last valid pose.
3. **Only Poser Visible**: During locking phase, verify only the poser's skeleton is rendered (copier's skeleton is not drawn).

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT (isBugCondition_Teleport(input) OR isBugCondition_Invisible(input) OR isBugCondition_LockingVisibility(input)) DO
  ASSERT lockTimerExpiration_original(input) = lockTimerExpiration_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for normal operation (poses detected, copying phase, match calculation), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Match Percentage Calculation**: Observe that during copying phase, match percentage is calculated correctly on unfixed code. Write test to verify this continues after fix.
2. **Temporal Smoothing**: Observe that temporal smoothing is applied to live poses but not to locked pose on unfixed code. Write test to verify this continues after fix.
3. **Round Transitions**: Observe that round transitions reset all pose refs correctly on unfixed code. Write test to verify this continues after fix.
4. **Buffer Phase Display**: Observe that during buffer phase, both skeletons are visible with reduced opacity on unfixed code. Write test to verify this continues after fix.
5. **Result Phase Display**: Observe that during result phase, green skeleton is displayed with reduced opacity on unfixed code. Write test to verify this continues after fix (but now at original position, not shifted).

### Unit Tests

- Test that `lastValidPoserPoseRef` is updated correctly during locking phase when valid poses are detected
- Test that fallback logic uses last valid pose when current pose is null at lock time
- Test that `lockedPoseRef.current` is rendered directly (not `displayLockedPoseRef.current`)
- Test that only poser's skeleton is rendered during locking phase
- Test that round transitions reset all pose refs including `lastValidPoserPoseRef`
- Test that `buildDisplayLockedPose` function is NOT called in the fixed code
- Test that green skeleton position matches poser's original position throughout copying phase

### Property-Based Tests

- Generate random sequences of pose detection results (valid/null patterns) during locking phase and verify that green skeleton is always visible after lock timer expires (as long as at least one valid pose was detected during locking)
- Generate random pose positions and verify that green skeleton stays at poser's original position (no shifting to copier's side)
- Generate random game states with various pose configurations and verify that match percentage calculation is unchanged
- Generate random round transitions and verify that all pose refs are reset correctly

### Integration Tests

- Test full game flow with simulated pose detection failures at various points during locking phase
- Test that green skeleton remains visible and frozen at the poser's ORIGINAL position throughout entire copying phase
- Test that visual feedback (glow effect) is applied correctly to green skeleton after fix
- Test that copier can still see their live yellow skeleton and match percentage during copying phase after fix
- Test that only the poser's skeleton is visible during the locking phase (copier's skeleton is hidden)
- Test that during buffer phase, both skeletons are still visible for positioning
- Test that the green skeleton does NOT "teleport" from poser's position to copier's position when lock timer expires
