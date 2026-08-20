# Plan: Sidebar Modernization & Interaction

Implement a collapsible, hover-to-expand sidebar for the dashboard, with a "pin" option (toggle fix) to keep it open.

## User Review Required
- The current layout uses a custom `aside` in `src/routes/_authenticated/dashboard.tsx`. I will refactor this to a state-driven collapsible sidebar.

## Technical Details

### 1. State Management
- Introduce `isPinned` state (boolean) to track if the sidebar should remain fixed.
- Introduce `isHovered` state (boolean) to track mouse position for the "auto-expand" behavior.

### 2. Styling (Tailwind)
- Use `transition-all` and `duration-300` for smooth width changes.
- Width: `w-20` (collapsed) vs `w-64` (expanded).
- Z-index: Ensure it stays above content but below modals.

### 3. Components
- **Sidebar Component**: The main container in `dashboard.tsx`.
- **Pin Toggle**: A subtle icon (Pin/PinOff) at the top of the sidebar.
- **Nav Links**: Adjust visibility of labels based on expansion state.

## Implementation Steps

### 1. Refactor `src/routes/_authenticated/dashboard.tsx`
- Add `isPinned` and `isHovered` states.
- Update the `aside` classes to be dynamic based on these states.
- Wrap the sidebar in event listeners for `onMouseEnter` and `onMouseLeave`.
- Add the toggle button for pinning.
- Conditionally render or animate text labels in the menu items.

### 2. Adjust Main Content Layout
- Ensure the main content shifts correctly when pinned/expanded to prevent overlap.
