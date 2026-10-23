# offline_modes

Mu Reforge only: our server's offline hand-overs, as buttons (UI/Reforge/ReforgeMuHelperOptions.cpp,
ReforgeOffStore.cpp).

## Public API
- `OfflineModes` (`state.ts`): `offLevel` (OFF EXP in the MU Helper window), `askOffStore` /
  `offStore` / `cancelOffStore` (OFF in the personal store, with a confirmation).

## How it works
- OFF EXP saves the MU Helper settings first (the offline session loads the stored ones), then sends
  `/offlevel`. OFF opens the store if it is not open yet, then sends `/offstore`.
- The server disconnects on purpose: `SessionResume.forget()` keeps the resume from logging straight
  back in and taking the offline session over (`UI::Logout::BeginSilent` in our client).

## Packets
- none: the commands are chat lines (`chat/sendLine.ts`).

## Depends on / used by
- uses: `mu_helper/state.ts`, `economy`, `session/sessionResume.ts`.
- used by: `versions/shared/ui/windows/reforge_hud/offModes.tsx` (in the MU Helper and personal shop windows).

## Tests
- `offlineModes.test.ts`: the order of the save, the store opening and the commands.
