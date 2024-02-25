function el(id){
    return document.getElementById(id)
}
/**
 * 
 * @param {string} key 
 * @returns value from localStorage named key
 */
function lsint(key){
    return parseInt(localStorage.getItem(key));
}