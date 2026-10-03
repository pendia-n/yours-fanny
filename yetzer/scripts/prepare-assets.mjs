import { copyFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
copyFileSync('../yetzer.svg', 'public/yetzer.svg');
mkdirSync('public/icons', {recursive:true});
for (const size of [192,512,180]) {
  const path = size===180 ? 'public/icons/apple-touch-icon.png' : `public/icons/icon-${size}.png`;
  execFileSync('magick',['-background','none','../yetzer.svg','-resize',`${size}x${size}!`,path]);
}
execFileSync('magick',['-background','none','../yetzer.svg','-resize','256x256!','-define','icon:auto-resize=64,48,32,16','public/favicon.ico']);
console.log('Prepared supplied Yetzer logo, favicon and PWA icons.');
