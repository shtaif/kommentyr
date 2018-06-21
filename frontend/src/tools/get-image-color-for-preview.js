import Vibrant from 'node-vibrant';


export default async imageUrl => {
    let vib = new Vibrant(imageUrl, {quality: 5});

    let palette = await vib.getPalette();

    let { r, g, b } = palette.DarkVibrant || palette.LightMuted || palette.Vibrant || {r: 0, g: 0, b: 0};

    return 'rgb('+r+','+g+','+b+')';
};
