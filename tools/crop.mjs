import sharp from 'sharp';
const [,, src, dest, top, h] = process.argv;
const meta = await sharp(src).metadata();
await sharp(src).extract({left:0, top:Number(top), width:meta.width, height:Math.min(Number(h), meta.height-Number(top))}).toFile(dest);
console.log('ok', dest);
