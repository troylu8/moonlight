/**
 * @param {number} len 
 * @returns {string} may contain `0-9` `a-z` `A-Z` `_` `-`
 */
export default function genID(len) {
    const map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
    
    let res = "";
    
    for (let i = 0; i < len; i++) 
        res += map[ crypto.getRandomValues(new Uint8Array(1))[0] >> 2 ]
    
    return res;
}