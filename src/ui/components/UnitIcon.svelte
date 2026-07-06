<script lang="ts">
  import type { UnitType } from '../../engine';

  let { type, size = 18 }: { type: UnitType; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  {#if type === 'infantry'}
    <circle cx="12" cy="4.6" r="2.5" />
    <path d="M8.8 8.2h6.4l-.6 6.8h-1.5l.8 7h-2.2l-.6-5.6h-.4l-.6 5.6H8.5l.8-7H7.8z" />
  {:else if type === 'artillery'}
    <path d="M10.4 15.4 18.8 4.6l2.1 1.7-8.3 10.6z" />
    <circle cx="8.8" cy="17.6" r="3.8" />
  {:else if type === 'armor'}
    <rect x="3" y="13.5" width="18" height="5.5" rx="2.75" />
    <rect x="7.8" y="9.5" width="7.6" height="4.5" rx="1.2" />
    <rect x="14.6" y="10.6" width="7.2" height="1.7" rx="0.85" />
  {:else if type === 'aaGun'}
    <path d="M10.9 16 5.6 6.4l1.9-1 5 9.5z" />
    <path d="M13.1 16l3.4-10.4 2 .7-3.3 10.2z" />
    <path d="M8.4 21h7.2l-1.6-4.4h-4z" />
  {:else if type === 'fighter'}
    <path d="M21.5 15.5v-2l-8-5V3.2a1.5 1.5 0 0 0-3 0v5.3l-8 5v2l8-2.5v5.5L8 20v1.5l4-1.2 4 1.2V20l-2.5-1.5V13z" />
  {:else if type === 'bomber'}
    <path d="M11 2.6h2l.5 5.3 8.5 1.6v2.4l-8.6-.6-.4 4.7 3 2.2v1.8L12 19.2l-4 .8v-1.8l3-2.2-.4-4.7-8.6.6V9.5l8.5-1.6z" />
  {:else if type === 'battleship'}
    <path d="M2.5 15h19l-2.6 4.8H5.1z" />
    <rect x="10.7" y="6.5" width="2.6" height="7.5" />
    <rect x="5.5" y="11.4" width="3.7" height="2.9" />
    <rect x="14.8" y="11.4" width="3.7" height="2.9" />
  {:else if type === 'carrier'}
    <path d="M1.8 13.2h20.4l-.5 2-2.2 3.9H5.2l-3-4.4z" />
    <rect x="13.8" y="8.8" width="3.6" height="4.4" />
  {:else if type === 'destroyer'}
    <path d="M3 15.2h18l-2.2 4.3H5.2z" />
    <rect x="8.8" y="10.6" width="6.4" height="3.9" />
    <rect x="11" y="6.8" width="2" height="3.8" />
  {:else if type === 'submarine'}
    <ellipse cx="12" cy="15.2" rx="9.2" ry="3.4" />
    <rect x="10.3" y="9.2" width="3.4" height="4" rx="0.8" />
    <rect x="11.4" y="6.6" width="1.2" height="2.8" />
  {:else if type === 'transport'}
    <path d="M3 15.2h18l-2.2 4.3H5.2z" />
    <rect x="5.8" y="11" width="5.4" height="3.6" />
    <rect x="12.2" y="11" width="5.4" height="3.6" />
  {/if}
</svg>
