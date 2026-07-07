<script lang="ts">
  import type { UnitType } from '../../engine';

  // Silhouettes traced from the unit art on page 5 ("The Combat Units")
  // of the Axis & Allies Europe gameplay manual.
  let { type, size = 18 }: { type: UnitType; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  {#if type === 'infantry'}
    <!-- Standing rifleman, rifle slung over the shoulder -->
    <path d="M10.2 1.1 l.85 -.18 L12.2 6.6 l-.85 .18 z" />
    <path d="M9 4.9 a3 3 0 0 1 6 0 l.3 .6 h-6.6 z" />
    <rect x="11" y="5.4" width="2" height="1.6" />
    <path
      d="M9.3 6.8 h5.4 q.5 0 .5 .5 l-.15 8.2 h-.55 v5.6 l.95 .6 v.9 h-3.1 v-6.2 h-.7 v6.2 h-3.1 v-.9 l.95 -.6 v-5.6 h-.55 L8.8 7.3 q0 -.5 .5 -.5 z"
    />
  {:else if type === 'artillery'}
    <!-- Field howitzer: barrel up-right, solid wheel, trail to the ground -->
    <path d="M9.4 12.9 L19.8 3.2 l1.6 1.7 L11 14.6 z" />
    <path d="M19.1 2.2 l1.2 -1.1 1.9 2 -1.2 1.1 z" />
    <path d="M7.4 12.6 l4.2 -3.9 3 3.2 -4.2 3.9 z" />
    <path d="M11.8 14.9 l3.6 -3.3 1.2 1.3 -3.6 3.3 z" />
    <path d="M8.3 14.2 L3 19.4 l1.2 1.2 L9.8 15.8 z" />
    <circle cx="14.6" cy="16.8" r="3.9" />
    <rect x="2.2" y="20.4" width="9" height="1.1" />
  {:else if type === 'armor'}
    <!-- Tank side profile, gun left, running gear with road wheels -->
    <rect x="1" y="10.5" width="7" height="1.3" />
    <rect x="1" y="10.1" width="1.6" height="2.1" />
    <path d="M7.6 8.7 h6.6 l2 2.9 H6.4 z" />
    <rect x="9.6" y="7.5" width="2.6" height="1.4" rx="0.5" />
    <path d="M4.6 11.6 h16.8 l-1.4 2.7 H5.4 z" />
    <rect x="20.4" y="10.7" width="1.7" height="1" />
    <path
      fill-rule="evenodd"
      d="M6.2 13.7 H17.8 a2.75 2.75 0 0 1 0 5.5 H6.2 a2.75 2.75 0 0 1 0 -5.5 z
         M6.5 15.3 a1.15 1.15 0 1 0 0 2.3 a1.15 1.15 0 1 0 0 -2.3 z
         M10 15.3 a1.15 1.15 0 1 0 0 2.3 a1.15 1.15 0 1 0 0 -2.3 z
         M13.5 15.3 a1.15 1.15 0 1 0 0 2.3 a1.15 1.15 0 1 0 0 -2.3 z
         M17 15.3 a1.15 1.15 0 1 0 0 2.3 a1.15 1.15 0 1 0 0 -2.3 z"
    />
  {:else if type === 'aaGun'}
    <!-- Flak gun on a domed mount, barrel high -->
    <path d="M10.3 15.4 L20.2 4.1 l1.5 1.3 L11.8 16.7 z" />
    <path d="M19.6 3.3 l1 -.9 1.9 2.1 -1 .9 z" />
    <path d="M8.2 15.9 l3.4 -3.9 2.6 2.3 -3.4 3.9 z" />
    <rect x="5.8" y="13.8" width="2.7" height="2.5" />
    <rect x="10" y="15.6" width="3.4" height="3.6" />
    <path d="M6 21.7 a6 4.2 0 0 1 12 0 z" />
  {:else if type === 'fighter'}
    <!-- Single-engine fighter from above, nose up, prop spinning -->
    <rect x="11.7" y="0.8" width="0.6" height="2" />
    <rect x="9.5" y="2.5" width="5" height="0.6" rx="0.3" />
    <path d="M12 2.6 c.9 0 1.4 .8 1.4 1.7 L13 16.2 12 17.8 11 16.2 10.6 4.3 c0 -.9 .5 -1.7 1.4 -1.7 z" />
    <path d="M2.4 8 L10.8 7.3 h2.4 L21.6 8 l-.9 2.4 -7.5 .5 h-2.4 L3.3 10.4 z" />
    <ellipse cx="12" cy="18.9" rx="1.1" ry="1.6" />
    <path d="M9 18.6 L11.2 17.7 h1.6 L15 18.6 l-.4 1.5 -2.2 -.3 h-.8 l-2.2 .3 z" />
  {:else if type === 'bomber'}
    <!-- Four-engine heavy bomber from above, nose up -->
    <path d="M12 1.6 c1 0 1.6 .9 1.6 2 L13.2 18.4 12 20.4 10.8 18.4 10.4 3.6 c0 -1.1 .6 -2 1.6 -2 z" />
    <path d="M1.6 8 L10.6 7 h2.8 L22.4 8 v1.5 L13.4 10.9 h-2.8 L1.6 9.5 z" />
    <rect x="4.85" y="6.3" width="1.5" height="3" rx="0.7" />
    <rect x="4.25" y="5.9" width="2.7" height="0.5" rx="0.25" />
    <rect x="7.85" y="6.3" width="1.5" height="3" rx="0.7" />
    <rect x="7.25" y="5.9" width="2.7" height="0.5" rx="0.25" />
    <rect x="14.65" y="6.3" width="1.5" height="3" rx="0.7" />
    <rect x="14.05" y="5.9" width="2.7" height="0.5" rx="0.25" />
    <rect x="17.65" y="6.3" width="1.5" height="3" rx="0.7" />
    <rect x="17.05" y="5.9" width="2.7" height="0.5" rx="0.25" />
    <ellipse cx="12" cy="19.4" rx="1.3" ry="1.9" />
    <path d="M8.7 19.3 L11.2 18.2 h1.6 L15.3 19.3 v1.2 L12.8 19.9 h-1.6 L8.7 20.5 z" />
  {:else if type === 'battleship'}
    <!-- Dreadnought profile: turrets fore and aft, massed superstructure -->
    <path d="M1.6 15.5 H22.4 L20.6 18.3 H3.6 z" />
    <rect x="2.6" y="14.8" width="4.6" height="0.9" />
    <rect x="16.8" y="14.8" width="4.4" height="0.9" />
    <rect x="5" y="13.7" width="2.6" height="1.3" />
    <rect x="1.8" y="14" width="3.2" height="0.55" />
    <rect x="16.2" y="13.7" width="2.6" height="1.3" />
    <rect x="18.9" y="14" width="3.4" height="0.55" />
    <rect x="8.2" y="12.8" width="7.4" height="2.2" />
    <rect x="9.2" y="11" width="3" height="2" />
    <rect x="9.9" y="9.3" width="1.7" height="1.9" />
    <circle cx="10.75" cy="9.3" r="0.9" />
    <path d="M13.2 13.2 v-1.8 l1.7 -.4 v2.2 z" />
    <rect x="15.1" y="10.4" width="0.5" height="2.6" />
  {:else if type === 'carrier'}
    <!-- Flat-top: full-length deck over a tapered hull, island amidships -->
    <path d="M1.2 11.9 H22.8 L20.9 13.8 H3 z" />
    <path d="M4.4 13.8 H19.6 L17.6 16.9 H6.6 z" />
    <path d="M9.2 8.3 h5.4 v3.6 H9.2 z" />
    <rect x="10" y="7.1" width="1" height="1.2" />
    <rect x="12" y="6.5" width="1" height="1.8" />
    <rect x="13.7" y="7.3" width="0.8" height="1" />
  {:else if type === 'destroyer'}
    <!-- Sleek escort: raised bow, forward gun, bridge with mast, raked funnel -->
    <path d="M2.3 16 H21.7 L19.9 18.5 H4.3 z" />
    <path d="M2.3 16 L6.6 15.1 V16 z" />
    <rect x="6.9" y="14.1" width="2.3" height="1.2" />
    <rect x="4.7" y="14.35" width="2.3" height="0.5" />
    <rect x="9.8" y="12.7" width="3" height="2.6" />
    <rect x="10.4" y="11.6" width="1.8" height="1.2" />
    <rect x="11.1" y="9.6" width="0.5" height="2" />
    <rect x="10.5" y="10.2" width="1.8" height="0.45" />
    <path d="M13.6 15.3 v-2 l1.8 -.35 v2.35 z" />
    <rect x="16" y="14.5" width="2.7" height="0.9" />
  {:else if type === 'submarine'}
    <!-- Surfaced boat: long low hull, conning tower, periscope -->
    <path d="M2.7 15.2 H19.2 L22.7 16.9 L18.8 18.8 H3.8 Q2.4 18.8 2.55 16.9 z" />
    <path d="M9.7 15.2 v-2.5 q0 -.7 .7 -.7 h2 q.7 0 .7 .7 v.5 h1.1 v2 z" />
    <rect x="10.6" y="10.5" width="0.6" height="1.7" />
  {:else if type === 'transport'}
    <!-- Cargo ship: kingpost derricks in Vs, small midships house -->
    <path d="M2.2 15.9 H21.8 L20.2 18.7 H4 z" />
    <path d="M2.2 15.9 L4.8 15 V15.9 z" />
    <rect x="4.6" y="15.1" width="2.2" height="0.8" />
    <rect x="10.6" y="13.9" width="3" height="2" />
    <rect x="11.4" y="12.8" width="1.3" height="1.2" />
    <path d="M7.8 15.9 l-1.9 -4.2 .8 -.36 1.5 3.3 1.5 -3.3 .8 .36 -1.9 4.2 z" />
    <path d="M16 15.9 l-1.9 -4.2 .8 -.36 1.5 3.3 1.5 -3.3 .8 .36 -1.9 4.2 z" />
    <path d="M19.6 15.9 l-1.9 -4.2 .8 -.36 1.5 3.3 1.5 -3.3 .8 .36 -1.9 4.2 z" />
  {/if}
</svg>
