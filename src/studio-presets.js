// Rules use & for the component root and @motion for a unique keyframe name.
const text = (label, value) => ({ type: 'text', label, value })
const color = (label, value) => ({ type: 'color', label, value })
const range = (label, value, min, max, step = 1) => ({ type: 'range', label, value, min, max, step })
const accent = (value = '#c54d36') => color('Accent', value)
const foreground = (value = '#293a58') => color('Foreground', value)
const secondary = (value = '#efddbc') => color('Secondary', value)
const copy = (v, escape) => escape(v.text)
const textNode = (v, escape) => `<span class="af-copy">${copy(v, escape)}</span>`
function control(v, escape, className, content) {
  const destination = v.destination?.trim()
  if (!v.demo && destination && /^(https?:\/\/[^\s/]|\/(?![\\/])|#[a-z0-9_-])/i.test(destination) && !/[\s\\]/.test(destination)) {
    return `<a href="${escape(destination)}" class="${className}">${content}</a>`
  }
  return `<button type="button" class="${className}">${content}</button>`
}
const destination = () => text('Link destination (optional)', '')
const action = (v, escape) => control(v, escape, 'af-action', `${textNode(v, escape)}<span class="af-arrow" aria-hidden="true"></span>`)
const marked = (v, escape) => `<span class="af-mark" aria-hidden="true"></span>${textNode(v, escape)}`
const details = (v, escape) => `<details class="af-details" ${v.demo ? 'open' : ''}><summary>${textNode(v, escape)}<span aria-hidden="true">+</span></summary><p>${escape(v.detail)}</p></details>`

export const studioPresets = [
  {
    id: 'editorial-rise', name: 'Editorial Rise', category: 'Hero & Type',
    description: 'A headline rises from a baseline mask and settles into place. Use it for the first sentence visitors see.',
    example: 'Landing page headline', controls: { text: text('Headline', 'Design for what’s next.'), travel: range('Rise distance', 48, 12, 95) },
    fontSize: 47, render: textNode,
    css: `& .af-stage{overflow:hidden;padding:.13em .1em}
& .af-copy{@play}
@keyframes @motion{from{translate:0 calc(var(--af-travel)*1%);opacity:0}to{translate:0;opacity:1}}`,
  },
  {
    id: 'ink-emphasis', name: 'Ink Emphasis', category: 'Hero & Type',
    description: 'A hand-drawn underline travels under an important phrase while the words stay readable.',
    example: 'Product value proposition', controls: { text: text('Highlighted phrase', 'Made to last.'), accent: accent(), thickness: range('Stroke weight', 4, 1, 12) },
    fontSize: 42, render: textNode,
    css: `& .af-copy{position:relative;padding-block:.14em}
& .af-copy::after{content:"";position:absolute;inset:auto 0 .04em;height:calc(var(--af-thickness)*1px);background:var(--af-accent);border-radius:75% 25% 64% 36%;transform-origin:left;@play}
@keyframes @motion{from{scale:0 1}to{scale:1}}`,
  },
  {
    id: 'tracking-reveal', name: 'Tracking Reveal', category: 'Hero & Type',
    description: 'Loose tracking tightens into a compact wordmark. Use it for an intro that reads cleanly at rest.',
    example: 'Brand or editorial opener', controls: { text: text('Wordmark', 'THE FIELD NOTES'), spread: range('Opening tracking', 20, 4, 35) },
    fontSize: 32, render: textNode,
    css: `& .af-copy{@play}
@keyframes @motion{from{opacity:0;letter-spacing:calc(var(--af-spread)*.01em)}to{opacity:1;letter-spacing:inherit}}`,
  },
  {
    id: 'split-type', name: 'Split Type', category: 'Hero & Type',
    description: 'Two independently editable lines arrive from opposite sides, then lock into an editorial headline.',
    example: 'Campaign masthead', controls: { text: text('First line', 'Make room'), detail: text('Second line', 'for better work.'), accent: accent(), travel: range('Travel', 46, 12, 95) },
    fontSize: 42,
    render: (v, escape) => `<span class="af-copy"><span>${copy(v, escape)}</span><span>${escape(v.detail)}</span></span>`,
    css: `& .af-copy>span{display:block;--af-side:1;@play}
& .af-copy>span+span{--af-side:-1;text-decoration:underline;text-decoration-color:var(--af-accent);text-underline-offset:.12em}
@keyframes @motion{from{translate:calc(var(--af-side)*var(--af-travel)*1px) 0;opacity:0}to{translate:0;opacity:1}}`,
  },
  {
    id: 'looping-announcement', name: 'Announcement Rail', category: 'Navigation',
    description: 'A seamless marquee for a short release note or event announcement. It pauses on hover or keyboard focus.',
    example: 'Site announcement strip', controls: { text: text('Announcement', 'SUMMER STUDIO IS OPEN'), foreground: foreground('#ba533b'), gap: range('Repeat spacing', 24, 12, 52) },
    fontSize: 17, duration: 9, loop: true,
    render: (v, escape) => `<div class="af-rail" role="group" tabindex="0" aria-label="${copy(v, escape)}"><div class="af-belt" aria-hidden="true">${Array.from({ length: 2 }, () => `<span>${Array.from({ length: 8 }, () => `<b>${copy(v, escape)}</b><i>✦</i>`).join('')}</span>`).join('')}</div></div>`,
    css: `& .af-rail{width:100%;overflow:hidden;border-block:1px solid color-mix(in srgb,var(--af-foreground) 48%,transparent);padding-block:.5em}
& .af-belt{display:flex;width:max-content;@play}
& .af-belt span{display:flex;align-items:center}
& .af-belt b,& .af-belt i{margin-inline-end:calc(var(--af-gap)*1px);white-space:nowrap}
& .af-belt i{color:var(--af-foreground);font-style:normal}
& .af-rail:is(:hover,:focus-visible) .af-belt{animation-play-state:paused}
@keyframes @motion{to{translate:-50% 0}}`,
  },
  {
    id: 'nav-inkline', name: 'Sliding Nav Indicator', category: 'Navigation',
    description: 'An indicator draws under a focused or hovered navigation label. The preview shows the interaction automatically.',
    example: 'Site header navigation item', controls: { text: text('Link label', 'Work'), destination: destination(), accent: accent(), thickness: range('Underline weight', 3, 1, 8) },
    fontSize: 23, duration: .35, trigger: 'interaction',
    render: (v, escape) => control(v, escape, 'af-nav', textNode(v, escape)),
    css: `& .af-nav{all:unset;cursor:pointer;color:inherit;position:relative;padding:.35em .2em}
& .af-nav::after{content:"";position:absolute;inset:auto 0 0;height:calc(var(--af-thickness)*1px);background:var(--af-accent);transform-origin:right;scale:0 1}
& .af-nav:is(:hover,:focus-visible)::after,&[data-af-demo] .af-nav::after{@play}
@keyframes @motion{from{scale:0 1;transform-origin:left}to{scale:1;transform-origin:left}}`,
  },
  {
    id: 'arrow-cta', name: 'Arrow CTA', category: 'Buttons',
    description: 'The arrow crosses a colored pill on hover or keyboard focus. A strong primary call to action with a restrained cue.',
    example: 'Pricing or signup CTA', controls: { text: text('Button label', 'Explore the work'), destination: destination(), foreground: foreground('#293a58'), accent: accent('#f2bf7d') },
    textColor: '#fff9ed', fontSize: 18, duration: .4, trigger: 'interaction', render: action,
    css: `& .af-action{background:var(--af-foreground);border:0;border-radius:999px;padding:.34em .38em .34em .86em;display:flex;align-items:center;gap:.7em;cursor:pointer;color:inherit;font:inherit}
& .af-arrow{position:relative;display:grid;flex:none;place-items:center;width:1.8em;height:1.8em;border-radius:50%;background:var(--af-accent);color:#29231e}
& .af-arrow::before{content:"";width:.65em;height:.65em;border-top:2px solid currentColor;border-right:2px solid currentColor}
& .af-arrow::after{content:"";position:absolute;width:.85em;height:2px;background:currentColor;rotate:-45deg}
& .af-action:is(:hover,:focus-visible) .af-arrow,&[data-af-demo] .af-arrow{@play}
@keyframes @motion{45%{translate:.19em -.19em;rotate:14deg}to{translate:0;rotate:0deg}}`,
  },
  {
    id: 'button-sweep', name: 'Magnetic Fill', category: 'Buttons',
    description: 'A curved color fill expands from under the label and settles inside the button.',
    example: 'Secondary action or product link', controls: { text: text('Button label', 'View the details'), destination: destination(), foreground: foreground('#6e4351'), accent: accent('#efc9c3') },
    fontSize: 19, duration: .45, trigger: 'interaction',
    render: (v, escape) => control(v, escape, 'af-action', textNode(v, escape)),
    css: `& .af-action{isolation:isolate;position:relative;overflow:hidden;border:1px solid var(--af-foreground);border-radius:.45em;background:transparent;padding:.55em 1.1em;color:inherit;font:inherit;cursor:pointer}
& .af-action::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--af-accent);border-radius:60% 60% 0 0;translate:0 105%}
& .af-action:is(:hover,:focus-visible)::before,&[data-af-demo] .af-action::before{@play}
@keyframes @motion{to{translate:0;border-radius:0}}`,
  },
  {
    id: 'disclosure-deploy', name: 'Expanding Disclosure', category: 'Navigation',
    description: 'A native disclosure opens on click or keyboard activation and reveals a short supporting answer.',
    example: 'FAQ or product specifications', controls: { text: text('Question', 'How does delivery work?'), detail: text('Answer', 'Ships within two business days.'), accent: accent('#8c493a') },
    fontSize: 20, duration: .4, trigger: 'disclosure', render: details,
    css: `& .af-details{width:min(100%,32rem);border-block:1px solid var(--af-accent);text-align:start}
& summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:1em;padding:.6em 0}
& summary::-webkit-details-marker{display:none}
& summary>span:last-child{color:var(--af-accent)}
& details[open] summary>span:last-child{rotate:45deg}
& details p{font-size:.74em;font-weight:400;margin:0;padding:0 0 .8em}
& details[open] p{@play}
@keyframes @motion{from{translate:0 -.5em;opacity:0}to{translate:0;opacity:1}}`,
  },
  {
    id: 'feature-card', name: 'Feature Card Lift', category: 'Cards',
    description: 'A product card lifts on hover or keyboard focus and gains a colored offset shadow.',
    example: 'Feature grid or portfolio tile', controls: { text: text('Card title', 'Analytics'), detail: text('Supporting copy', 'See how your team works.'), destination: destination(), foreground: foreground('#e5d8f4'), accent: accent('#745e9b'), travel: range('Lift', 9, 3, 20) },
    fontSize: 21, duration: .45, trigger: 'interaction',
    render: (v, escape) => control(v, escape, 'af-feature', `${textNode(v, escape)}<small>${escape(v.detail)}</small><span class="af-corner" aria-hidden="true"></span>`),
    css: `& .af-feature{position:relative;width:min(100%,25rem);display:grid;gap:.4em;text-align:start;border:1px solid var(--af-accent);background:var(--af-foreground);color:inherit;font:inherit;border-radius:.55em;padding:.8em 1em;cursor:pointer}
& .af-feature small{font-size:.67em;font-weight:500}
& .af-feature .af-copy{padding-inline-end:.7em}
& .af-corner{position:absolute;inset:.65em .65em auto auto;width:.4em;height:.4em;border-top:2px solid var(--af-accent);border-right:2px solid var(--af-accent)}
& .af-feature:is(:hover,:focus-visible),&[data-af-demo] .af-feature{@play}
@keyframes @motion{to{translate:0 calc(var(--af-travel)*-1px);box-shadow:0 .45em 0 color-mix(in srgb,var(--af-accent) 55%,transparent)}}`,
  },
  {
    id: 'card-stack', name: 'Case Study Stack', category: 'Cards',
    description: 'Offset sheets settle beneath a foreground card to suggest a series or portfolio collection.',
    example: 'Featured case-study module', controls: { text: text('Card title', 'Fieldwork / 01'), foreground: foreground('#f5dfae'), accent: accent('#c76959'), secondary: secondary('#94a0a0') },
    fontSize: 27,
    render: (v, escape) => `<div class="af-stack">${textNode(v, escape)}</div>`,
    css: `& .af-stack{isolation:isolate;position:relative;margin-block:.3em 1.35em;border-radius:.42em;max-width:88%}
& .af-stack::before,& .af-stack::after{content:"";position:absolute;z-index:-1;inset:5% 6%;border-radius:inherit;transform-origin:50% 100%;@play}
& .af-stack::before{--af-tilt:-9deg;background:var(--af-accent)}
& .af-stack::after{--af-tilt:10deg;background:var(--af-secondary)}
& .af-stack .af-copy{position:relative;display:block;z-index:1;padding:.7em 1.1em;border-radius:inherit;background:var(--af-foreground);box-shadow:0 0 0 1px color-mix(in srgb,currentColor 25%,transparent)}
@keyframes @motion{from{rotate:0;translate:0}to{rotate:var(--af-tilt);translate:0 39%}}`,
  },
  {
    id: 'signal-mark', name: 'Signal Wordmark', category: 'Logos',
    description: 'A three-ring signal draws in beside a wordmark, giving an app logo a clear introduction.',
    example: 'Opening brand lockup', controls: { text: text('Brand name', 'Signal House'), accent: accent('#bf563b') },
    fontSize: 32,
    render: (v, escape) => `<span class="af-logo">${marked(v, escape)}</span>`,
    css: `& .af-logo{display:flex;align-items:center;gap:.5em}
& .af-mark{display:block;flex:none;width:1.1em;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,var(--af-accent) 0 8%,transparent 9% 19%);@play}
@keyframes @motion{from{clip-path:circle(0)}to{clip-path:circle(72%)}}`,
  },
  {
    id: 'monogram-frame', name: 'Monogram Frame', category: 'Logos',
    description: 'Opposing corner brackets frame a short monogram and remain visible once the intro ends.',
    example: 'Studio logo or author stamp', controls: { text: text('Monogram', 'AF'), accent: accent('#8b605a'), travel: range('Bracket travel', 14, 5, 32) },
    fontSize: 40, render: textNode,
    css: `& .af-copy{position:relative;min-width:1.9em;padding:.3em;overflow-wrap:anywhere}
& .af-copy::before,& .af-copy::after{content:"";position:absolute;width:.46em;height:.46em;border:2px solid var(--af-accent);@play}
& .af-copy::before{inset:0 auto auto 0;border-right:0;border-bottom:0;--af-side:-1}
& .af-copy::after{inset:auto 0 0 auto;border-left:0;border-top:0;--af-side:1}
@keyframes @motion{from{translate:calc(var(--af-side)*var(--af-travel)*1px) calc(var(--af-side)*var(--af-travel)*1px);opacity:0}to{translate:0;opacity:1}}`,
  },
  {
    id: 'section-focus', name: 'Section Focus', category: 'Reveals',
    description: 'A short blur-to-sharp reveal places emphasis on a section heading as it enters the viewport.',
    example: 'Below-the-fold section opener', controls: { text: text('Section heading', 'A clearer way forward'), blur: range('Opening blur', 8, 1, 18), travel: range('Lift', 14, 0, 40) },
    fontSize: 36, behavior: 'reveal', render: textNode,
    css: `&[data-af-entered] .af-copy,&[data-af-demo] .af-copy{@play}
@keyframes @motion{from{filter:blur(calc(var(--af-blur)*1px));translate:0 calc(var(--af-travel)*1px);opacity:0}to{filter:none;translate:0;opacity:1}}`,
  },
  {
    id: 'chapter-curtain', name: 'Chapter Curtain', category: 'Reveals',
    description: 'A colored strip passes over the title and clears it, like a printed section divider.',
    example: 'Page transition or feature chapter', controls: { text: text('Chapter title', '02 / The approach'), accent: accent('#c76d55') },
    fontSize: 32, render: textNode,
    css: `& .af-copy{position:relative;isolation:isolate;padding:.15em .28em;overflow:hidden}
& .af-copy::after{content:"";position:absolute;inset:0;background:var(--af-accent);translate:-102% 0;@play}
@keyframes @motion{0%{translate:-102% 0}48%{translate:0}100%{translate:102% 0}}`,
  },
  {
    id: 'route-iris', name: 'Route Iris', category: 'Reveals',
    description: 'An expanding aperture reveals a compact chapter label. Fits a route transition or interstitial.',
    example: 'Portfolio route transition', controls: { text: text('Route label', 'Selected work'), foreground: foreground('#e5dbf1'), accent: accent('#9c6a89') },
    fontSize: 31,
    render: (v, escape) => `<div class="af-iris">${textNode(v, escape)}</div>`,
    css: `& .af-iris{padding:.65em 1.2em;background:var(--af-foreground);border-radius:.7em;border:1px solid var(--af-accent);@play}
@keyframes @motion{from{clip-path:ellipse(0 0 at 50% 70%)}to{clip-path:ellipse(78% 105% at 50% 70%)}}`,
  },
  {
    id: 'loading-rail', name: 'Indeterminate Rail', category: 'Loaders',
    description: 'A clipped moving segment signals activity without presenting a misleading percentage.',
    example: 'Loading content with unknown duration', controls: { foreground: foreground('#8366ae'), secondary: secondary('#e3d8e9'), thickness: range('Rail height', 6, 3, 15) },
    duration: 1.45, loop: true,
    render: () => '<span class="af-loading-rail" role="status" aria-label="Loading"><i aria-hidden="true"></i></span>',
    css: `& .af-loading-rail{display:block;width:min(15rem,92%);height:calc(var(--af-thickness)*1px);border-radius:999px;background:var(--af-secondary);overflow:hidden}
& .af-loading-rail i{display:block;width:42%;height:100%;border-radius:inherit;background:var(--af-foreground);@play}
@keyframes @motion{from{translate:-110% 0;scale:.55 1}45%{translate:65% 0;scale:1.1 1}to{translate:260% 0;scale:.65 1}}`,
  },
  {
    id: 'skeleton-shimmer', name: 'Card Skeleton', category: 'Loaders',
    description: 'Three placeholder lines share a light sweep. Their layout reserves space while a card loads.',
    example: 'Article or profile-card placeholder', controls: { foreground: foreground('#d9c8df'), accent: accent('#f9f2ea') },
    duration: 1.8, loop: true,
    render: () => '<span class="af-skeleton" role="status" aria-label="Loading"><i></i><i></i><i></i></span>',
    css: `& .af-skeleton{width:min(92%,16rem);display:grid;gap:7px}
& .af-skeleton i{height:12px;border-radius:99px;background:linear-gradient(100deg,var(--af-foreground) 30%,var(--af-accent) 50%,var(--af-foreground) 70%) 0/230% 100%;@play}
& .af-skeleton i:first-child{height:19px;width:54%}
& .af-skeleton i:last-child{width:70%}
@keyframes @motion{to{background-position:200% 0}}`,
  },
  {
    id: 'live-status', name: 'Live Status Beacon', category: 'Status',
    description: 'A small signal ripples around a stable status label. Useful where the state should read even when motion is disabled.',
    example: 'Availability or live stream badge', controls: { text: text('Status label', 'Available now'), foreground: foreground('#147564'), glow: range('Ripple size', 11, 4, 20) },
    fontSize: 19, duration: 2, loop: true,
    render: (v, escape) => `<span class="af-status">${marked(v, escape)}</span>`,
    css: `& .af-status{display:flex;align-items:center;gap:.65em}
& .af-mark{width:.55em;aspect-ratio:1;border-radius:50%;background:var(--af-foreground);@play}
@keyframes @motion{from{box-shadow:0 0 0 0 var(--af-foreground)}70%,100%{box-shadow:0 0 0 calc(var(--af-glow)*1px) transparent}}`,
  },
  {
    id: 'payment-success', name: 'Success Check', category: 'Status',
    description: 'A check draws beside a stable confirmation label. Use the badge after a completed action.',
    example: 'Payment or form confirmation', controls: { text: text('Confirmation', 'Changes saved'), accent: accent('#1b806c'), foreground: foreground('#cbe8d9') },
    fontSize: 21,
    render: (v, escape) => `<span class="af-confirm"><i aria-hidden="true"></i>${textNode(v, escape)}</span>`,
    css: `& .af-confirm{display:flex;align-items:center;gap:.5em;background:var(--af-foreground);padding:.45em .65em;border-radius:.55em}
& .af-confirm i{width:.67em;height:.38em;border-left:.105em solid var(--af-accent);border-bottom:.105em solid var(--af-accent);rotate:-45deg;@play}
@keyframes @motion{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0)}}`,
  },
  {
    id: 'contour-backdrop', name: 'Contour Backdrop', category: 'Backgrounds',
    description: 'A soft field of contour lines drifts behind the page. The spaces between lines can stay transparent.',
    example: 'Hero texture or section divider', controls: { foreground: foreground('#8c71ac'), accent: accent('#c16f59'), pitch: range('Contour spacing', 14, 7, 30) },
    duration: 12, loop: true,
    render: () => '<div class="af-contours" aria-hidden="true"></div>',
    css: `& .af-contours{width:145%;min-height:inherit;align-self:stretch;background:repeating-radial-gradient(ellipse at 53% 115%,transparent 0 calc(var(--af-pitch)*1px - 1px),var(--af-foreground) calc(var(--af-pitch)*1px - 1px) calc(var(--af-pitch)*1px));mask-image:linear-gradient(110deg,transparent,#000 40%,#000 70%,transparent);border-bottom:2px solid var(--af-accent);@play}
@keyframes @motion{0%,100%{transform:translateX(-11%) scale(1)}50%{transform:translateX(1%) scale(1.1)}}`,
  },
  {
    id: 'hero-light-field', name: 'Hero Light Field', category: 'Backgrounds',
    description: 'Two complementary pools of light drift behind a heading or illustration with genuinely transparent edges.',
    example: 'Editorial hero atmosphere', controls: { foreground: foreground('#e4957c'), accent: accent('#a492ca'), secondary: secondary('#eac086'), spread: range('Light radius', 50, 30, 78) },
    duration: 10, loop: true,
    render: () => '<div class="af-lightfield" aria-hidden="true"></div>',
    css: `& .af-lightfield{width:100%;align-self:stretch;min-height:inherit;background:radial-gradient(ellipse at center,color-mix(in srgb,var(--af-foreground) 80%,transparent),transparent calc(var(--af-spread)*1%)),radial-gradient(ellipse at center,var(--af-accent),transparent calc(var(--af-spread)*1%)),radial-gradient(ellipse at center,var(--af-secondary),transparent 51%);background-repeat:no-repeat;background-size:95% 185%,100% 165%,92% 118%;@play}
@keyframes @motion{0%,100%{background-position:-250% 0,230% 90%,50% 30%}50%{background-position:250% 60%,-230% 10%,65% 83%}}`,
  },
  {
    id: 'celebration-sparks', name: 'Celebration Sparks', category: 'Status',
    description: 'A short burst of colored marks around a clear confirmation label. Reserve it for meaningful milestones.',
    example: 'Onboarding completion or personal best', controls: { text: text('Confirmation', 'Milestone reached'), foreground: foreground('#ae5669'), accent: accent('#c08c29'), secondary: secondary('#327b6c'), count: range('Spark count', 12, 5, 22), travel: range('Burst distance', 58, 25, 100), size: range('Spark size', 7, 3, 12) },
    fontSize: 23, duration: 1.2,
    render: (v, escape) => `<span class="af-sparks">${Array.from({ length: v.count }, (_, index) => `<i aria-hidden="true" style="--af-bearing:${index * 360 / v.count}deg"></i>`).join('')}${textNode(v, escape)}</span>`,
    css: `& .af-sparks{position:relative}
& .af-sparks i{position:absolute;inset:50% auto auto 50%;width:calc(var(--af-size)*1px);aspect-ratio:2/1;border-radius:80% 20%;background:var(--af-foreground);opacity:0;@play}
& .af-sparks i:nth-child(3n){background:var(--af-accent)}
& .af-sparks i:nth-child(3n+1){background:var(--af-secondary)}
@keyframes @motion{0%{transform:rotate(var(--af-bearing)) translateX(8px) scale(.25)}20%{opacity:1}100%{transform:rotate(var(--af-bearing)) translateX(calc(var(--af-travel)*1px)) scale(.6);opacity:0}}`,
  },
]
