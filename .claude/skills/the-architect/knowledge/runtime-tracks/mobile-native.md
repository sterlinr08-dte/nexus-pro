# Runtime Track: Mobile Native

> Choose this when the deliverable is an app installed from the App Store or Google Play — push notifications, camera, offline storage, background work, a home-screen icon.

**Last verified: 2026-10-17** — every version below was checked against the npm registry, the Expo
SDK 58 `bundledNativeModules.json` and default template, and the vendors' release feeds on this date.
SDK 58 became npm `latest` on 2026-10-16. When refreshing this file, re-verify and update this line.

## When to choose this track

- **Default to Expo.** Managed workflow, config plugins, `expo-router`, EAS Build and EAS Update. It
  covers roughly 95% of mobile products and it is what the rest of this file assumes.
- **Ejecting is almost never necessary.** Expo's continuous native generation (CNG) plus config
  plugins means you can add native dependencies and edit `Info.plist` / `AndroidManifest.xml` without
  ever checking in `ios/` and `android/`. If someone says "we'll need to eject for X", make them name
  X first — it is usually already a config plugin.
- **Go fully native (Swift/SwiftUI + Kotlin/Compose) only when the product is genuinely native-heavy:**
  custom camera pipelines, ARKit/ARCore, low-latency audio/DSP, Live Activities and widgets as a core
  surface, CarPlay/watchOS/visionOS, or you need a platform API the day it ships rather than a
  release cycle later.
- **Not this track** if the answer is really a responsive web app — see `knowledge/runtime-tracks/ts-node.md`.
  Shipping a WebView wrapper gets rejected under App Review guideline 4.2 (minimum functionality).
- **Flutter** is a legitimate choice — one codebase, excellent rendering consistency, strong for
  design-heavy apps. Pick it only if the team already writes Dart. It cannot share code or types with
  a TypeScript backend, which is the single biggest reason to prefer Expo.

## Pinned versions

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | Expo SDK | `58.0.14` | npm `latest`; SDK line `sdk-58` (SDK 57 is `57.0.30` on `sdk-57`) |
| Runtime | React Native | `0.88.0` | Expo SDK 58 pins exact `0.88.0`; also npm `latest` |
| UI | React | `19.3.0` | RN 0.88 peer is `^19.3.0` |
| Routing | `expo-router` | `~58.0.23` | Versioning changed — see Gotchas |
| Styling | `nativewind` | `4.2.7` | Needs `tailwindcss` **3.x**, not 4 |
| Styling | `tailwindcss` (native only) | `~3.4.19` | `v3-lts` tag. Pinned separately from any web app in the repo |
| Animation | `react-native-reanimated` | `4.7.1` | SDK pin = npm `latest`; peer RN `0.86 - 0.88` |
| Animation | `react-native-worklets` | `0.13.0` | Mandatory peer of Reanimated 4 (`0.13.x`) |
| Gestures | `react-native-gesture-handler` | `~3.3.0` | SDK 58 adopts GH 3; npm `latest` 3.4.0 is outside the SDK range — use `expo install` |
| Navigation | `react-native-screens` | `~4.30.0` | `5.0.0-alpha` is on `next` — do not install |
| Navigation | `react-native-safe-area-context` | `~5.10.1` | |
| Web output | `react-native-web` | `~0.21.4` | Optional; only if you want a web target |
| Language | TypeScript | `~6.0.3` | Expo SDK 58 template pin. TS 7.0.2 exists; template has not moved |
| Types | `@types/react` | `~19.3.0` | |
| Testing | `jest-expo` | `~58.0.11` | Major must match the SDK major |
| Lint | `eslint-config-expo` | `~58.0.4` | Driven by `expo lint` |
| Build/deploy | `eas-cli` | `25.1.1` | |
| Health check | `expo-doctor` | `1.21.5` | |
| Toolchain | Node | `^22.13 \|\| ^24.3 \|\| >=26` required, **24 LTS** recommended | RN 0.87 dropped Node 20; Expo SDK 58 tooling rejects odd releases (23, 25) |
| Toolchain | JDK | `17` (Azul Zulu) | |
| Toolchain | Android SDK | compile **37**, target **36** (Android 16), min 24 | Expo SDK 58 defaults. Play requires target 36 for new apps and updates since 2026-08-31 (extensions to 2026-11-01) |
| Toolchain | Xcode | **26.4+** with the iOS 26 SDK | Expo SDK 58 minimum (iOS 16.4+ deployment). App Store Connect requires Xcode 26+ since 2026-04-28. SDK 58 is built for iOS 27 / Xcode 27 |

### Fully-native sub-track

| Platform | Language | Version | UI |
|---|---|---|---|
| iOS | Swift | `6.4.1` | SwiftUI, with UIKit for anything SwiftUI still can't do (complex collection views, precise keyboard control). The language version you build with is the one bundled in your Xcode |
| Android | Kotlin | `2.4.21` | Jetpack Compose via BOM `2026.09.00` |
| Cross-platform alt | Flutter / Dart | `3.47.7` / `3.13.5` | Flutter stable channel |

## Setup

```bash
# 1. Scaffold — pin the SDK: until Expo Go for SDK 58 ships, interactive runs prompt between SDK 58 and 57.
#    This template already includes expo-router, reanimated, worklets, gesture-handler 3
npx create-expo-app@latest my-app --template default@sdk-58
cd my-app

# 2. NativeWind. Note the explicit npm install: `expo install` is SDK-aware but NativeWind is not in
#    Expo's bundled module list, so it would pull Tailwind 4 and break the build.
npm install nativewind@^4.2.7
npm install --save-dev tailwindcss@~3.4.19 prettier-plugin-tailwindcss
npx tailwindcss init

# 3. Verify the whole dependency graph agrees with the SDK
npx expo-doctor@latest

# 4. Run
npx expo start
```

`babel.config.js` — the worklets plugin **must be last**:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
```

No `plugins` entry for worklets: `babel-preset-expo` 58 adds `react-native-worklets/plugin` itself
when `react-native-worklets` is installed (unless `worklets: false`). Listing it again registers it twice.

`metro.config.js`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" });
```

## Conventions

```
app/                      # expo-router: filesystem = navigation. This is the only router.
  _layout.tsx             # Root: providers, fonts, splash gate
  (tabs)/                 # Route group — parens do not appear in the URL
    _layout.tsx
    index.tsx
  (auth)/
    sign-in.tsx
  [id].tsx                # Dynamic segment
  +not-found.tsx
components/               # Presentational only. No data fetching.
features/<domain>/        # Screens' business logic, hooks, and API calls, colocated
lib/                      # api client, storage, analytics, notification registration
constants/theme.ts        # Design tokens. Mirror them into tailwind.config.js — one source.
global.css                # Tailwind directives, imported once in the root layout
app.config.ts             # Prefer .ts over app.json: env-driven bundle IDs and variants
eas.json                  # development / preview / production profiles
```

- **Never create `ios/` or `android/` directories in git.** Stay on CNG. Native changes go through
  config plugins or `expo-build-properties`.
- One screen file = one route. Push data fetching down into `features/<domain>` hooks so screens stay
  under ~150 lines.
- Secrets never live in `app.config.ts` — anything in the JS bundle is readable. Use EAS environment
  variables for build-time values and a server for anything actually secret.
- Use `expo-secure-store` for tokens, `expo-sqlite` or MMKV for local data. Not AsyncStorage for
  credentials.

## Testing / Lint / Build commands

| Task | Command |
|---|---|
| Dev server | `npx expo start` |
| Type check | `npx tsc --noEmit` |
| Lint | `npx expo lint` |
| Unit tests | `npx jest` (preset `jest-expo`) |
| Dependency health | `npx expo-doctor@latest` |
| Upgrade SDK | `npx expo install expo@^59.0.0 --fix` then `npx expo-doctor@latest` |
| Regenerate native dirs | `npx expo prebuild --clean` |
| Dev build (device) | `eas build -p ios --profile development` |
| Production build | `eas build -p all --profile production` |
| Ship JS-only fix | `eas update --branch production --environment production --message "fix: …"` |
| Submit to stores | `eas submit -p ios --latest` / `eas submit -p android --latest` |

E2E: **Maestro** for flows (`maestro test .maestro/`). It is far less brittle than Detox on Expo and
runs against the same dev build EAS already produced. `playwright-cli` does not apply here.

## Deployment notes

**EAS Build** produces the binaries. Three profiles, always: `development` (dev client, internal
distribution), `preview` (release-mode internal build for QA and TestFlight-alikes), `production`
(store submission). Get the development build onto a real device on day one — Expo Go is a demo
sandbox, not your app, and anything with a custom native module will not run in it.

**EAS Update** ships JS, styles, images, copy, and layout over the air. It cannot change native code,
permissions, or the Expo SDK version. The gate is `runtimeVersion`: an update only reaches builds
whose runtime version matches, so bumping native code creates a new runtime and correctly strands old
binaries. Use `--branch` per environment, roll out gradually, and keep the previous update ready to
republish as a rollback.

**What actually needs a store review vs. what does not:**

| Change | Path |
|---|---|
| Bug fix, copy, styling, new screen built from existing native modules | EAS Update — live in minutes |
| Feature flag flip, A/B config, remote content | EAS Update or your own config endpoint |
| New permission (camera, location, contacts) | New build + review |
| New native dependency or config plugin | New build + review |
| Expo SDK / RN upgrade | New build + review |
| App icon, name, App Store metadata or screenshots | Store review (metadata-only review is faster) |

**The policy line on OTA.** App Review guideline 2.5.2 reads strictly — apps "may not download,
install, or execute code which introduces or changes features or functionality." OTA JS updates
survive on the Developer Program License Agreement's interpreted-code carve-out, and Apple has not
enforced against Expo/CodePush-style updates in practice. The rule that matters: **never use an
update to change what the app is.** Shipping a feature you deliberately hid from review is guideline
2.3.1 (hidden features), and that is the one with "removal from the Apple Developer Program" attached.
Fixes and iteration, yes. A different app after approval, no.

**Review timelines — plan around these, do not gamble on them.** Apple reviews the large majority of
submissions within 24–48 hours, but a first submission from a new team, an app with accounts, or
anything touching payments or health data routinely takes longer, and a rejection resets the clock.
Google Play is usually faster for updates but a **first** release of a new personal developer account
can sit in extended review for days and requires closed testing before production. Budget a week for
your first ship on each store. Never promise a launch date that depends on a same-day approval.

**The rejections that actually happen** (in rough order of frequency):

1. **2.1 — incomplete.** No demo account, or the backend was down during review. Put working
   credentials in App Store Connect's review notes every single submission.
2. **5.1.1(v) — no in-app account deletion.** If users can create an account, they must be able to
   delete it inside the app. Not "email support."
3. **5.1.1 — privacy.** Missing privacy policy URL, a Privacy Manifest that does not match what the
   SDKs actually collect, or a vague purpose string. "This app needs your location" is not a reason.
4. **3.1.1 — payments.** Any digital good or subscription must go through IAP; linking out to your
   own checkout for in-app content is a rejection. Storefront-specific exception: Apple's guidelines
   3.1.1(a) and 3.1.3 let apps on the **United States storefront** include buttons, external links, or
   calls to action to other purchase methods; other storefronts need a region-limited StoreKit External
   Purchase Link Entitlement or forbid it. These rules move — the builder re-checks
   `developer.apple.com/app-store/review/guidelines/` (and Google Play's payments policy) before
   shipping any non-IAP path.
5. **4.2 — minimum functionality.** Thin WebView wrappers and link collections.
6. **4.8 — login.** Third-party social login as the primary account without an equivalent
   privacy-preserving alternative (Sign in with Apple satisfies this).
7. **Crash on launch on the reviewer's device.** Test a release-mode build on a physical device, not
   just the simulator.

## Gotchas

- **The New Architecture is the only architecture. Delete every `newArchEnabled` setting you find.**
  RN 0.82 made bridgeless mandatory: `newArchEnabled=false` on Android and `RCT_NEW_ARCH_ENABLED=0`
  on iOS are *ignored*. RN 0.84 began physically removing Legacy Architecture components. Any tutorial
  or config that toggles this flag is pre-0.82 and stale — remove the line, do not set it to `true`.
  If a third-party library still needs the old architecture, it needs replacing, not a flag.
- **Upgrade Expo through `expo install --fix`, never by hand-editing `package.json`.** The SDK is a
  matched set of ~40 native modules; a manual bump of one desynchronizes the native build in ways that
  surface as opaque Gradle or CocoaPods errors. The path is: `npx expo install expo@^<next> --fix`,
  then `npx expo-doctor@latest`, then read the SDK changelog. Same for adding any package with native
  code: `npx expo install <pkg>`, not `npm install <pkg>`.
- **SDK 58 moved `react-native-gesture-handler` to 3.x (`~3.3.0`).** GH 3 adds the hook API
  (`usePanGesture`, `useTapGesture`, …, plus `GestureDetector`) and keeps the old `Gesture` builder and
  `Legacy*` components — read from the 3.3.0 published types. Code written for 2.x against SDK 57 must
  be checked on upgrade. npm `latest` (3.4.0) is outside the SDK's `~3.3.0`, so always `npx expo install`.
- **Reanimated 4 needs `react-native-worklets` as a separate install, and the babel plugin renamed.**
  It is `"react-native-worklets/plugin"`, not `"react-native-reanimated/plugin"`. `babel-preset-expo`
  adds it for you (see the babel config above); list it yourself, as the last plugin, only without
  that preset or with `worklets: false`. Reanimated 4.x also only runs on the New Architecture.
- **The old Hermes + Reanimated 3 memory hang is dead — do not repeat it.** The current live memory
  caveat is different and much narrower: Worklets **Bundle Mode** re-evaluates the JS bundle on each
  extra runtime in *development*, costing up to ~4× bundle size per runtime. It does not affect
  production, where bytecode is used and extra runtimes are nearly free. If you hit it, develop on a
  device without a heavily constrained heap rather than disabling Bundle Mode.
- **NativeWind stable is a Tailwind 3 library.** `nativewind@4.2.7` depends on
  `react-native-css-interop@0.2.7`, whose peer is `tailwindcss: ~3`. NativeWind 5 (`5.0.0-rc.0`,
  requires Tailwind `>4.1.11` plus `react-native-css@3.1.0-rc.0`) is still a prerelease. In a monorepo
  that also has a Tailwind 4 web app, keep two separate Tailwind versions and share only the *token
  file*, not the config.
- **`expo-router` versioning changed.** It is now `~58.0.23` — lockstep with the SDK. Older docs
  showing `expo-router@5` or `@6` describe SDK 53 and 54. Do not "upgrade" to a lower-looking number.
- **`npx expo prebuild` wipes `ios/` and `android/` by default** (since SDK 57; unchanged in SDK 58). Pass `--no-clean` to
  preserve them. If that matters to you, you have manual native edits that belong in a config plugin.
- **Android edge-to-edge is enforced on Android 15+.** RN 0.86 improved handling, but you still owe
  every screen correct `SafeAreaView` / `useSafeAreaInsets` treatment or content sits under the system
  bars on modern devices.
- **SDK 58 breaking changes that hit real apps** (Expo SDK 58 changelog): RN 0.87's Strict TypeScript
  API is the default (deep `react-native/Libraries/*` imports are type errors; temporary opt-out via
  `customConditions`, removed after RN 0.89); iOS now uses the UIScene lifecycle (prebuild generates
  `SceneDelegate.swift`); Expo CLI forces `NODE_ENV` per command, so `.env.test` no longer loads under
  `expo start`; R8 minification is on in Android release builds; `File.write()` is async; libSQL was
  removed from expo-sqlite. Expo Go for SDK 58 is not yet in the stores — use a development build.
- **iOS build minutes are the schedule risk.** EAS free-tier iOS queues can be long. For a team on a
  deadline, a paid plan or a self-hosted runner is a cost line item, not an optimization.
- **Fully-native sub-track:** SwiftUI previews break constantly in large modules — keep view files
  small and prefer a runnable sample app target. On Android, always use the Compose **BOM** rather
  than pinning individual `androidx.compose.*` artifacts; mismatched Compose artifact versions are the
  #1 source of runtime crashes there.

## Shapes that use this track

- `knowledge/shapes/mobile-app.md` — the primary consumer
- `knowledge/shapes/agent-app.md` — when the agent surface is a phone app rather than a web client
- `knowledge/shapes/generative-media-app.md` — when capture and on-device media handling are central

## See also

- `knowledge/runtime-tracks/ts-node.md` — the companion API/backend; share types across both
- `knowledge/capabilities/auth.md` — mobile auth adds secure token storage and deep-link callbacks
- `knowledge/capabilities/payments-rails.md` — IAP vs. Stripe is a store-policy decision, not a
  technical one
- `knowledge/capabilities/deployment.md` — EAS in the context of the wider release pipeline
- `knowledge/stack-compatibility.md` — the SDK-pinned-version traps above, cross-checked
- `knowledge/skills-registry.md` — `ui-ux-pro-max` for the mobile design system, `emil-design-eng`
  for motion; both degrade gracefully if absent
