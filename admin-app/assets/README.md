# Assets Folder

This folder should contain the following images for the Expo app:

## Required Images:
- `icon.png` - App icon (1024x1024px)
- `adaptive-icon.png` - Android adaptive icon (1024x1024px)
- `splash.png` - Splash screen image (1284x2778px for iPhone 12 Pro Max)
- `favicon.png` - Web favicon (48x48px)

## How to add images:
1. Create or download appropriate images with the sizes mentioned above
2. Place them in this `assets` folder
3. Update the paths in `app.json` if needed

## Temporary Solution:
For now, you can create simple placeholder images or use Expo's default assets by running:
```bash
npx create-expo-app --template blank-typescript temp-app
cp temp-app/assets/* ./assets/
rm -rf temp-app
```
