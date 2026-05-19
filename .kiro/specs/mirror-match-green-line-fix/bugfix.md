# Bugfix Requirements Document

## Introduction

The Mirror Match game has a critical bug where the green reference skeleton (locked pose) that shows the poser's frozen pose to the copier during the copying phase either moves/drifts or is not visible at all. This breaks the core gameplay mechanic, as the copier cannot see what pose they need to match.

The game flow is:
1. **Locking phase (5 seconds)**: The poser strikes a pose while both players see their own skeletons
2. **Lock moment (timer hits 0)**: The poser's pose should be frozen/captured
3. **Copying phase (6 seconds)**: The copier sees their own skeleton in yellow and the frozen reference pose in green with glow effect

The bug occurs at step 3, where the green skeleton either:
- Moves or drifts instead of staying frozen in place
- Is not visible at all (null/undefined)

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the lock timer expires and `livePoserPoseRef.current` is null THEN the system sets `lockedPoseRef.current` to null, causing the green reference skeleton to be invisible during the copying phase

1.2 WHEN the lock timer expires and `copierPoseAtLockRef.current` is null THEN the system cannot properly position the green reference skeleton on the copier's side, resulting in incorrect positioning or null display

1.3 WHEN the lock timer expires and `displayLockedPoseRef.current` is computed from null pose data THEN the system sets `displayLockedPoseRef.current` to null, causing the green reference skeleton to not render during the copying phase

1.4 WHEN the copying phase is active and `displayLockedPoseRef.current` is null THEN the `drawSkeleton` function receives null and renders nothing, making the green reference skeleton invisible

1.5 WHEN pose detection temporarily fails during the locking phase THEN the system overwrites valid pose data with null, causing the locked pose to be lost

### Expected Behavior (Correct)

2.1 WHEN the lock timer expires and `livePoserPoseRef.current` is null THEN the system SHALL use the last valid poser pose detected during the locking phase, ensuring the green reference skeleton is always visible

2.2 WHEN the lock timer expires and `copierPoseAtLockRef.current` is null THEN the system SHALL use a default position based on the copier's side of the screen (left or right) to position the green reference skeleton

2.3 WHEN the lock timer expires THEN the system SHALL ensure `displayLockedPoseRef.current` contains a valid frozen pose that will not change during the entire copying phase

2.4 WHEN the copying phase is active THEN the system SHALL always render the green reference skeleton with glow effect at the same fixed position throughout the 6-second copying period

2.5 WHEN pose detection temporarily fails during the locking phase THEN the system SHALL preserve the last valid pose data and only update when a new valid pose is detected

### Unchanged Behavior (Regression Prevention)

3.1 WHEN both players are detected during the locking phase THEN the system SHALL CONTINUE TO show both skeletons (poser in blue/red, copier in red/blue) so both players can see themselves

3.2 WHEN the copying phase is active and the copier's pose is detected THEN the system SHALL CONTINUE TO render the copier's live skeleton in yellow and calculate the match percentage

3.3 WHEN the match percentage is calculated during the copying phase THEN the system SHALL CONTINUE TO compare the copier's live pose against the frozen locked pose using the `comparePoses` function

3.4 WHEN the green reference skeleton is rendered during the copying phase THEN the system SHALL CONTINUE TO apply the glow effect (green color with shadow blur)

3.5 WHEN the game transitions between rounds THEN the system SHALL CONTINUE TO reset all pose references (lockedPoseRef, displayLockedPoseRef, livePoserPoseRef, copierPoseAtLockRef) to null

3.6 WHEN temporal smoothing is applied to live poses THEN the system SHALL CONTINUE TO smooth pose1 and pose2 but SHALL NOT apply smoothing to the frozen locked pose

3.7 WHEN the result phase displays the outcome THEN the system SHALL CONTINUE TO show the frozen green reference skeleton with reduced opacity (0.5)
