# Kura

## Status
Kura is a work in progress. The main flows are implemented (auth + core list/pantry features), and I’m currently improving reliability, polish, and expanding features.


Kura is a personal food and household management app built with Expo (React Native).
It focuses on three core areas:
- Pantry tracking
- Shopping lists
- Recipes

## Tech stack
- Expo + React Native
- React Navigation (stack + bottom tabs)
- Supabase (auth + database)
- Open Food Facts (barcode lookup)

## Features
- Email auth via Supabase
- Tab navigation: Pantry, Recipes, Shopping List
- Add/edit shopping lists and items
- Add/edit recipes and ingredients
- Barcode scanning + ingredient suggestions (Open Food Facts)

## Getting started

### Prereqs
- Node.js (LTS recommended)
- Git (optional)
- Expo Go on your phone, or Android Studio emulator / iOS Simulator

### Install
```bash
npm ci
