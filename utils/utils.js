const getRandItem  = (items) => {

    return items[Math.floor(Math.random() * items.length)];
}


exports.getRandItem = getRandItem;
