function serialize(obj) { var str = ''; for (var key in obj) { if (str != '') { str += '&'; } str += key + '=' + encodeURIComponent(obj[key]); } return str; }

class Axios {
    constructor() { }
    request(config) {
        const { method = 'get', url = '', data = {} } = config;
        return new Promise(resolve => {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.onload = function () {
                resolve(xhr.responseText);
            }
            xhr.send(data);
        })
    }
    get(url, data) {
        return new Promise(resolve => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onload = function () {

                resolve(xhr.responseText)
            }
            xhr.send(data);
        })
    }
    post(url, data) {
        return new Promise(resolve => {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.onload = function () {

                resolve(xhr.responseText)
            }
            xhr.send(serialize(data));
        })
    }
}

var axios = new Axios();