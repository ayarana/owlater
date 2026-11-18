// Owlater's mascot: an owl drawn in SVG. Colors come from the theme variables,
// so it adapts to every theme. Put <span class="mascot" data-mascot></span> anywhere.
const OWL_SVG = `
<svg class="owl" viewBox="0 0 64 64" aria-hidden="true">
  <path class="owl-wing" d="M9 34Q3 46 12 55Q16 46 14 36Z"/>
  <path class="owl-wing" d="M55 34Q61 46 52 55Q48 46 50 36Z"/>
  <ellipse class="owl-feet" cx="25" cy="60.5" rx="4.5" ry="2.3"/>
  <ellipse class="owl-feet" cx="39" cy="60.5" rx="4.5" ry="2.3"/>
  <path class="owl-main" d="M10 24L12 5L25 14Q32 12 39 14L52 5L54 24Q58 32 56 42Q52 60 32 60Q12 60 8 42Q6 32 10 24Z"/>
  <ellipse class="owl-belly" cx="32" cy="47" rx="13" ry="11.5"/>
  <ellipse class="owl-cheek" cx="14" cy="38.5" rx="3.2" ry="2"/>
  <ellipse class="owl-cheek" cx="50" cy="38.5" rx="3.2" ry="2"/>
  <g class="owl-eyes">
    <circle cx="23" cy="30" r="8.5" fill="#fff"/>
    <circle cx="41" cy="30" r="8.5" fill="#fff"/>
    <circle cx="24" cy="31" r="4.4" fill="#232136"/>
    <circle cx="40" cy="31" r="4.4" fill="#232136"/>
    <circle cx="25.7" cy="29.3" r="1.6" fill="#fff"/>
    <circle cx="41.7" cy="29.3" r="1.6" fill="#fff"/>
  </g>
  <path class="owl-beak" d="M29.5 36h5L32 41Z"/>
</svg>`;

document.querySelectorAll("[data-mascot]").forEach((el) => {
  el.innerHTML = OWL_SVG;
});
