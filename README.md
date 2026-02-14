# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Auth0 configuration

The app now includes Auth0-powered authentication with login, logout, and profile UI on the home screen. To finish configuration:

1. Provide your Auth0 values as environment variables (for example in `.env` when using `expo start --config app.config.ts`):
   ```bash
   export EXPO_PUBLIC_AUTH0_DOMAIN="your-tenant.us.auth0.com"
   export EXPO_PUBLIC_AUTH0_CLIENT_ID="yourClientId"
   ```
   These values are injected via `app.config.ts` into the config plugin and exposed in `Constants.expoConfig?.extra`.
2. After changing the domain/package identifiers, run `npx expo prebuild` so the Auth0 config plugin can update the native projects.
3. Add the following callback and logout URLs to your Auth0 application settings (the domain is already set to `dev-hhtarorh33yux8dc.us.auth0.com`):
   - iOS callback: `com.basket.auth0://dev-hhtarorh33yux8dc.us.auth0.com/ios/com.basket/callback`
   - Android callback: `com.basket.auth0://dev-hhtarorh33yux8dc.us.auth0.com/android/com.basket/callback`
   - iOS logout: `com.basket.auth0://dev-hhtarorh33yux8dc.us.auth0.com/ios/com.basket/logout`
   - Android logout: `com.basket.auth0://dev-hhtarorh33yux8dc.us.auth0.com/android/com.basket/logout`
4. Start the development build or EAS/Custom Dev Client (the Auth0 SDK is not compatible with Expo Go) and test the new login/logout buttons (`AuthStatusCard`) in `app/(tabs)/index.tsx`.
