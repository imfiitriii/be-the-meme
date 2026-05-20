# Bugfix Requirements Document

## Introduction

The Mirror Match game has critical bugs affecting the green reference skeleton (locked pose) during the copying phase, breaking the core gameplay mechanic.

The game flow is:
1. **Locking phase (5 seconds)**: The poser strikes a pose while both players see their own skeletons
2. **Lock moment (timer hits 0)**: The poser's pose should be frozen/captured at its original position
3. **Copying phase (6 seconds)**: The copier sees their own skeleton in yellow and the frozen reference pose in green with glow effect

**Bug 1: Green Skeleton Teleports (Position Bug)**
The `buildDisplayLockedPose` function shifts the locked pose to the copier's side of the screen, causing the green skeleton to "teleport" from where the poser originally struck the pose to where the copier is standing. This fundamentally breaks the gameplay because:
- During locking, both skeletons are visible (blue and red)
- When the timer expires, the green skeleton should stay exactly where the poser was
- Instead, it jumps to the copier's position, making it impossible to see the original pose location

**Bug 2: Green Skeleton Visibility Issues**
The green skeleton may not be visible at all during the copying phase due to null pose data, either from:
- Missing pose detection at the lock moment
- Null values overwriting valid pose data during the locking phase

## Bug Analysis

### Current Behavior (Defect)

**Position Bug (Teleporting Green Skeleton):**

1.1 WHEN the lock timer expires THEN the system calls `buildDisplayLockedPose` which shifts the locked pose to the copier's side of the screen using `shiftPoseX(lockedPose, targetX - lockedHipX)`

1.2 WHEN `buildDisplayLockedPose` shifts the pose THEN the green reference skeleton "teleports" from the poser's original position to where the copier is standing, making it impossible to see where the pose was originally struck

1.3 WHEN both skeletons are visible during the locking phase (blue and red) THEN the system correctly shows both players in their original positions, but this correct positioning is lost when the green skeleton is shifted

1.4 WHEN the copier tries to match the pose THEN the copier sees the green skeleton at their own location instead of at the poser's original location, breaking the core gameplay mechanic

**Visibility Bug (Null Pose Data):**

1.5 WHEN the lock timer expires and `livePoserPoseRef.current` is null THEN the system sets `lockedPoseRef.current` to null, causing the green reference skeleton to be invisible during the copying phase

1.6 WHEN the lock timer expires and `copierPoseAtLockRef.current` is null THEN the system cannot properly position the green reference skeleton on the copier's side, resulting in incorrect positioning or null display

1.7 WHEN the lock timer expires and `displayLockedPoseRef.current` is computed from null pose data THEN the system sets `displayLockedPoseRef.current` to null, causing the green reference skeleton to not render during the copying phase

1.8 WHEN the copying phase is active and `displayLockedPoseRef.current` is null THEN the `drawSkeleton` function receives null and renders nothing, making the green reference skeleton invisible

1.9 WHEN pose detection temporarily fails during the locking phase THEN the system overwrites valid pose data with null, causing the locked pose to be lost

**Locking Phase Visibility:**

1.10 WHEN the locking phase is active THEN the system shows BOTH skeletons (poser and copier), but only the POSER's skeleton should be visible during this phase

### Expected Behavior (Correct)

**Position Fix (No Teleporting):**

2.1 WHEN the lock timer expires THEN the system SHALL freeze the poser's pose at its ORIGINAL position without shifting it to the copier's side

2.2 WHEN the copying phase begins THEN the system SHALL display the green reference skeleton at the EXACT position where the poser struck the pose during the locking phase

2.3 WHEN the copier views the green reference skeleton THEN the copier SHALL see it at the poser's original location (not shifted to the copier's position), allowing proper visual comparison

2.4 WHEN the green reference skeleton is rendered THEN the system SHALL NOT apply any horizontal shifting based on the copier's position

**Visibility Fix (Always Show Valid Pose):**

2.5 WHEN the lock timer expires and `livePoserPoseRef.current` is null THEN the system SHALL use the last valid poser pose detected during the locking phase, ensuring the green reference skeleton is always visible

2.6 WHEN the lock timer expires and `copierPoseAtLockRef.current` is null THEN the system SHALL still display the locked pose at its original position without requiring copier pose data for positioning

2.7 WHEN the lock timer expires THEN the system SHALL ensure `displayLockedPoseRef.current` contains a valid frozen pose that will not change during the entire copying phase

2.8 WHEN the copying phase is active THEN the system SHALL always render the green reference skeleton with glow effect at the same fixed position throughout the 6-second copying period

2.9 WHEN pose detection temporarily fails during the locking phase THEN the system SHALL preserve the last valid pose data and only update when a new valid pose is detected

**Locking Phase Visibility Fix:**

2.10 WHEN the locking phase is active THEN the system SHALL show ONLY the poser's skeleton (not both skeletons), allowing the poser to focus on striking the pose without distraction

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the copying phase is active and the copier's pose is detected THEN the system SHALL CONTINUE TO render the copier's live skeleton in yellow and calculate the match percentage

3.2 WHEN the match percentage is calculated during the copying phase THEN the system SHALL CONTINUE TO compare the copier's live pose against the frozen locked pose using the `comparePoses` function with normalized poses

3.3 WHEN the green reference skeleton is rendered during the copying phase THEN the system SHALL CONTINUE TO apply the glow effect (green color with shadow blur)

3.4 WHEN the game transitions between rounds THEN the system SHALL CONTINUE TO reset all pose references (lockedPoseRef, displayLockedPoseRef, livePoserPoseRef, copierPoseAtLockRef) to null

3.5 WHEN temporal smoothing is applied to live poses THEN the system SHALL CONTINUE TO smooth pose1 and pose2 but SHALL NOT apply smoothing to the frozen locked pose

3.6 WHEN the result phase displays the outcome THEN the system SHALL CONTINUE TO show the frozen green reference skeleton with reduced opacity (0.5)

3.7 WHEN poses are detected THEN the system SHALL CONTINUE TO use the `splitPoses` function to separate Player 1 (visual left, hip X > 0.5) from Player 2 (visual right, hip X <= 0.5)

3.8 WHEN the buffer countdown is active THEN the system SHALL CONTINUE TO show both players' live skeletons with reduced opacity so they can position themselves

3.9 WHEN the webcam is rendered THEN the system SHALL CONTINUE TO use mirrored mode so players see themselves correctly
