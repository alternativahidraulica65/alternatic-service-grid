# Plan: Agricultural Login Screen Implementation

Implement a new login screen theme focused on the agricultural sector, as requested in the visual text instructions.

## User-Facing Changes
- **New Visual Identity**: Transition from industrial metallic theme to agricultural theme.
- **Background**: High-quality agricultural image (plantation/tractor) with a dark overlay (40%).
- **Card**: Centralized login card with yellow accents (#FFD700).
- **Text Updates**: Title changed to "Acesso à Plataforma".
- **Functionality**: Keep existing Supabase authentication logic.

## Technical Details
- **File**: `src/routes/index.tsx`
- **Styling**: 
    - Use Tailwind classes for the background image and overlay.
    - Update icons and color accents to yellow/gold.
    - Maintain Montserrat and Inter typography as per project memory.
- **Assets**: Use a high-quality Unsplash image for the background.
- **Supabase**: Maintain the recently configured connection to the `mpwnrcxyyeqftrejwmmx` project.

## Steps
1. Update `src/routes/index.tsx` to implement the new layout and styles.
2. Adjust the background image with a proper agricultural theme.
3. Update brand labels and titles to match the new "Acesso à Plataforma" requirement.
4. Verify the visual layout with a screenshot.
