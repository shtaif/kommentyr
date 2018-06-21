export default async (...urls) => {
    return await urls.map(url => {
        let img = new Image;
        img.src = url;
        return new Promise(resolve => img.onload);
    });
};
