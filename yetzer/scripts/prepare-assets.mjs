import { copyFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
copyFileSync('../yetzer.svg', 'public/yetzer.svg');
mkdirSync('public/icons', {recursive:true});
for (const size of [192,512,180]) {
  const path = size===180 ? 'public/icons/apple-touch-icon.png' : `public/icons/icon-${size}.png`;
  await sharp('../yetzer.svg').resize(size,size).png().toFile(path);
}
const faviconPng=await sharp('../yetzer.svg').resize(256,256).png().toBuffer();
execFileSync('magick',['png:-','-define','icon:auto-resize=64,48,32,16','public/favicon.ico'],{input:faviconPng});
console.log('Prepared supplied Yetzer logo, favicon and PWA icons.');
