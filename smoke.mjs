// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

class Event {
    handlers = [];
    messages = [];
    once(func) {
        this.handlers.push({
            once: true,
            func
        });
        this.dispatch();
    }
    on(func) {
        this.handlers.push({
            once: false,
            func
        });
        this.dispatch();
    }
    remove(func) {
        this.handlers = this.handlers.filter((handler)=>handler.func != func);
    }
    emit(data) {
        this.messages.push(data);
        this.dispatch();
    }
    dispatch() {
        while(this.messages.length > 0 && this.handlers.length > 0){
            const message = this.messages.shift();
            const onces = this.handlers.filter((listener)=>listener.once);
            const ons = this.handlers.filter((listener)=>!listener.once);
            this.handlers = [
                ...ons
            ];
            onces.forEach((listener)=>listener.func(message));
            ons.forEach((listener)=>listener.func(message));
        }
    }
    dispose() {
        while(this.handlers.length > 0){
            this.handlers.shift();
        }
        while(this.messages.length > 0){
            this.messages.shift();
        }
    }
}
class Events {
    events;
    constructor(){
        this.events = new Map();
    }
    once(event, func) {
        if (!this.events.has(event)) {
            this.events.set(event, new Event());
        }
        this.events.get(event).once(func);
    }
    on(event, func) {
        if (!this.events.has(event)) {
            this.events.set(event, new Event());
        }
        this.events.get(event).on(func);
    }
    remove(event, func) {
        if (!this.events.has(event)) {
            this.events.set(event, new Event());
        }
        this.events.get(event).remove(func);
    }
    emit(event, data) {
        if (event === "error" && !this.events.has(event)) {
            throw data;
        }
        if (!this.events.has(event)) {
            this.events.set(event, new Event());
        }
        this.events.get(event).emit(data);
    }
    dispose() {
        for (const key of this.events.keys()){
            const event = this.events.get(key);
            this.events.delete(key);
            event.dispose();
        }
    }
}
class Barrier {
    awaiters = [];
    paused = true;
    pause() {
        this.paused = true;
    }
    resume() {
        this.paused = false;
        this.dispatch();
    }
    run(func) {
        return !this.paused ? Promise.resolve(func()) : new Promise((resolve, reject)=>{
            this.awaiters.push({
                func: func,
                resolve,
                reject
            });
        });
    }
    async dispatch() {
        while(this.awaiters.length > 0){
            const awaiter = this.awaiters.shift();
            Promise.resolve(awaiter.func()).then((result)=>awaiter.resolve(result)).catch((error)=>awaiter.reject(error));
        }
    }
}
class Semaphore {
    awaiters;
    running;
    constructor(concurrency = 1){
        this.concurrency = concurrency;
        this.awaiters = [];
        this.running = 0;
    }
    run(func) {
        return new Promise((resolve, reject)=>{
            this.awaiters.push({
                func,
                resolve,
                reject
            });
            this.dispatch();
        });
    }
    async dispatch() {
        if (this.awaiters.length === 0 || this.running >= this.concurrency) {
            return;
        }
        const awaiter = this.awaiters.shift();
        this.running += 1;
        try {
            awaiter.resolve(await awaiter.func());
            setTimeout(()=>{
                this.running -= 1;
                this.dispatch();
            }, 1);
        } catch (error) {
            awaiter.reject(error);
            setTimeout(()=>{
                this.running -= 1;
                this.dispatch();
            }, 1);
        }
    }
    concurrency;
}
class QueryString {
    static parseQuerySegments(s) {
        const markers = [];
        for(let i2 = 0; i2 < s.length; i2++){
            const next = s.charAt(i2);
            if (next === "#") {
                break;
            }
            if (next === "?") {
                markers.push(i2);
            }
        }
        const segments = [];
        for(let i1 = 0; i1 < markers.length; i1++){
            segments.push(s.slice(markers[i1] + 1, markers[i1 + 1]));
        }
        return segments;
    }
    static parsePairs(segment) {
        return segment.split("&").map((assign)=>assign.split("=")).filter((pair)=>pair[0] !== "").map((pair)=>{
            const key = pair[0];
            const value = pair[1] || "";
            return [
                key,
                value
            ];
        });
    }
    static expandResult(pairs) {
        const result = {};
        for (const [key, value] of pairs){
            if (result[key] === undefined) {
                result[key] = [];
            }
            result[key] = [
                ...result[key],
                value
            ];
        }
        return result;
    }
    static collapseResult(result1) {
        for (const key of Object.keys(result1)){
            let array = result1[key];
            array = array.filter((value, index, result)=>result.indexOf(value) === index);
            if (array.length > 1) {
                array = array.filter((value)=>value.length > 0);
            }
            if (array.length === 1) {
                result1[key] = array[0];
            } else {
                result1[key] = array;
            }
        }
        return result1;
    }
    static parse(url) {
        const queries = this.parseQuerySegments(url);
        const pairs = queries.map((seg)=>this.parsePairs(seg)).flatMap((pair)=>pair);
        const expanded = this.expandResult(pairs);
        return this.collapseResult(expanded);
    }
}
class Url {
    static parseProtocol(href) {
        for(let i3 = 0; i3 < href.length; i3++){
            if (href.charAt(i3) === ":") {
                const next0 = href.charAt(i3 + 1);
                const next1 = href.charAt(i3 + 2);
                if (next0 === "/" && next1 === "/") {
                    return [
                        href.slice(0, i3 + 1),
                        href.slice(i3 + 3)
                    ];
                }
            }
        }
        return [
            null,
            href
        ];
    }
    static parseAuth(s) {
        for(let i4 = 0; i4 < s.length; i4++){
            if (s.charAt(i4) === "/") {
                return [
                    null,
                    s
                ];
            }
            if (s.charAt(i4) === "@") {
                return [
                    s.slice(0, i4),
                    s.slice(i4 + 1)
                ];
            }
        }
        return [
            null,
            s
        ];
    }
    static parseHostname(s) {
        for(let i5 = 0; i5 < s.length; i5++){
            const next = s.charAt(i5);
            if (next === "/" || next === "?" || next === "#") {
                return [
                    s.slice(0, i5),
                    s.slice(i5)
                ];
            }
        }
        return [
            s,
            ""
        ];
    }
    static parseHost(hostname) {
        for(let i6 = 0; i6 < hostname.length; i6++){
            const next = hostname.charAt(i6);
            if (next === ":") {
                return [
                    hostname.slice(0, i6),
                    hostname.slice(i6)
                ];
            }
        }
        return [
            hostname,
            ""
        ];
    }
    static parsePort(hostname) {
        for(let i7 = 0; i7 < hostname.length; i7++){
            if (hostname.charAt(i7) === ":") {
                return [
                    hostname.slice(i7 + 1),
                    ""
                ];
            }
        }
        return [
            null,
            hostname
        ];
    }
    static parsePath(s) {
        if (s.length === 0) {
            return [
                "/",
                ""
            ];
        }
        return [
            s,
            ""
        ];
    }
    static parsePathname(path) {
        for(let i8 = 0; i8 < path.length; i8++){
            const next = path.charAt(i8);
            if (next === "?" || next === "#") {
                return [
                    path.slice(0, i8),
                    path.slice(i8)
                ];
            }
        }
        return [
            path,
            ""
        ];
    }
    static parseHash(path) {
        for(let i9 = 0; i9 < path.length; i9++){
            const next = path.charAt(i9);
            if (next === "#") {
                return [
                    path.slice(i9),
                    path.slice(0, i9)
                ];
            }
        }
        return [
            null,
            path
        ];
    }
    static parseSearch(path) {
        for(let i10 = 0; i10 < path.length; i10++){
            const next = path.charAt(i10);
            if (next === "?") {
                return [
                    path.slice(i10),
                    path.slice(0, i10)
                ];
            }
        }
        return [
            "",
            path
        ];
    }
    static parseQuery(search) {
        for(let i11 = 0; i11 < search.length; i11++){
            const next = search.charAt(i11);
            if (next === "?") {
                return [
                    search.slice(i11 + 1),
                    search.slice(0, i11)
                ];
            }
        }
        return [
            "",
            search
        ];
    }
    static parse(href) {
        const [protocol, r0] = this.parseProtocol(href);
        if (protocol) {
            const [auth, r1] = this.parseAuth(r0);
            const [hostname, r2] = this.parseHostname(r1);
            const [host, _r3] = this.parseHost(hostname);
            const [port, _r4] = this.parsePort(hostname);
            const [path, _r5] = this.parsePath(r2);
            const [pathname, _r6] = this.parsePathname(path);
            const [hash, r7] = this.parseHash(path);
            const [search, _r8] = this.parseSearch(r7);
            const [query, _r9] = this.parseQuery(search);
            return {
                protocol,
                auth,
                hash,
                host,
                hostname,
                href,
                path,
                pathname,
                port,
                query,
                search
            };
        } else {
            const [path, _r5] = this.parsePath(r0);
            const [pathname, _r6] = this.parsePathname(path);
            const [hash, r7] = this.parseHash(path);
            const [search, _r8] = this.parseSearch(r7);
            const [query, _r9] = this.parseQuery(search);
            return {
                protocol,
                auth: null,
                hash,
                host: null,
                hostname: null,
                href,
                path,
                pathname,
                port: null,
                query,
                search
            };
        }
    }
}
function read(buffer, offset, isLE, mLen, nBytes) {
    let e, m;
    const eLen = nBytes * 8 - mLen - 1;
    const eMax = (1 << eLen) - 1;
    const eBias = eMax >> 1;
    let nBits = -7;
    let i12 = isLE ? nBytes - 1 : 0;
    const d = isLE ? -1 : 1;
    let s = buffer[offset + i12];
    i12 += d;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;
    for(; nBits > 0; e = e * 256 + buffer[offset + i12], i12 += d, nBits -= 8){}
    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;
    for(; nBits > 0; m = m * 256 + buffer[offset + i12], i12 += d, nBits -= 8){}
    if (e === 0) {
        e = 1 - eBias;
    } else if (e === eMax) {
        return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
}
function write(buffer, value, offset, isLE, mLen, nBytes) {
    let e, m, c;
    let eLen = nBytes * 8 - mLen - 1;
    const eMax = (1 << eLen) - 1;
    const eBias = eMax >> 1;
    const rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    let i13 = isLE ? 0 : nBytes - 1;
    const d = isLE ? 1 : -1;
    const s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
    } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
        }
        if (e + eBias >= 1) {
            value += rt / c;
        } else {
            value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
            e++;
            c /= 2;
        }
        if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
        } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
        } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
        }
    }
    for(; mLen >= 8; buffer[offset + i13] = m & 0xff, i13 += d, m /= 256, mLen -= 8){}
    e = e << mLen | m;
    eLen += mLen;
    for(; eLen > 0; buffer[offset + i13] = e & 0xff, i13 += d, e /= 256, eLen -= 8){}
    buffer[offset + i13 - d] |= s * 128;
}
const lookup = [];
const revLookup = [];
const Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
const code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for(let i = 0, len = code.length; i < len; ++i){
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
}
revLookup["-".charCodeAt(0)] = 62;
revLookup["_".charCodeAt(0)] = 63;
function getLens(b64) {
    const len1 = b64.length;
    if (len1 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
    }
    let validLen = b64.indexOf("=");
    if (validLen === -1) validLen = len1;
    const placeHoldersLen = validLen === len1 ? 0 : 4 - validLen % 4;
    return [
        validLen,
        placeHoldersLen
    ];
}
function _byteLength(validLen, placeHoldersLen) {
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}
function toByteArray(b64) {
    const lens = getLens(b64);
    const validLen = lens[0];
    const placeHoldersLen = lens[1];
    const arr = new Arr(_byteLength(validLen, placeHoldersLen));
    let tmp;
    let curByte = 0;
    const len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
    let i1 = 0;
    for(i1 = 0; i1 < len2; i1 += 4){
        tmp = revLookup[b64.charCodeAt(i1)] << 18 | revLookup[b64.charCodeAt(i1 + 1)] << 12 | revLookup[b64.charCodeAt(i1 + 2)] << 6 | revLookup[b64.charCodeAt(i1 + 3)];
        arr[curByte++] = tmp >> 16 & 0xff;
        arr[curByte++] = tmp >> 8 & 0xff;
        arr[curByte++] = tmp & 0xff;
    }
    if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i1)] << 2 | revLookup[b64.charCodeAt(i1 + 1)] >> 4;
        arr[curByte++] = tmp & 0xff;
    }
    if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i1)] << 10 | revLookup[b64.charCodeAt(i1 + 1)] << 4 | revLookup[b64.charCodeAt(i1 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 0xff;
        arr[curByte++] = tmp & 0xff;
    }
    return arr;
}
function tripletToBase64(num) {
    return lookup[num >> 18 & 0x3f] + lookup[num >> 12 & 0x3f] + lookup[num >> 6 & 0x3f] + lookup[num & 0x3f];
}
function encodeChunk(uint8, start, end) {
    let tmp;
    const output = [];
    for(let i2 = start; i2 < end; i2 += 3){
        tmp = (uint8[i2] << 16 & 0xff0000) + (uint8[i2 + 1] << 8 & 0xff00) + (uint8[i2 + 2] & 0xff);
        output.push(tripletToBase64(tmp));
    }
    return output.join("");
}
function fromByteArray(uint8) {
    let tmp;
    const len3 = uint8.length;
    const extraBytes = len3 % 3;
    const parts = [];
    const maxChunkLength = 16383;
    for(let i3 = 0, len2 = len3 - extraBytes; i3 < len2; i3 += maxChunkLength){
        parts.push(encodeChunk(uint8, i3, i3 + 16383 > len2 ? len2 : i3 + 16383));
    }
    if (extraBytes === 1) {
        tmp = uint8[len3 - 1];
        parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 0x3f] + "==");
    } else if (extraBytes === 2) {
        tmp = (uint8[len3 - 2] << 8) + uint8[len3 - 1];
        parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 0x3f] + lookup[tmp << 2 & 0x3f] + "=");
    }
    return parts.join("");
}
const MAX_ARGUMENTS_LENGTH = 0x1000;
const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
class Buffer extends Uint8Array {
    static swap(buf, n, m) {
        const i14 = buf[n];
        buf[n] = buf[m];
        buf[m] = i14;
    }
    swap16() {
        const len4 = this.length;
        if (len4 % 2 !== 0) {
            throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for(let i15 = 0; i15 < len4; i15 += 2){
            Buffer.swap(this, i15, i15 + 1);
        }
        return this;
    }
    swap32() {
        const len5 = this.length;
        if (len5 % 4 !== 0) {
            throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for(let i16 = 0; i16 < len5; i16 += 4){
            Buffer.swap(this, i16, i16 + 3);
            Buffer.swap(this, i16 + 1, i16 + 2);
        }
        return this;
    }
    swap64() {
        const len6 = this.length;
        if (len6 % 8 !== 0) {
            throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for(let i17 = 0; i17 < len6; i17 += 8){
            Buffer.swap(this, i17, i17 + 7);
            Buffer.swap(this, i17 + 1, i17 + 6);
            Buffer.swap(this, i17 + 2, i17 + 5);
            Buffer.swap(this, i17 + 3, i17 + 4);
        }
        return this;
    }
    slowToString(...args) {
        let loweredCase = false;
        if (args[1] === undefined || args[1] < 0) {
            args[1] = 0;
        }
        if (args[1] > this.length) {
            return "";
        }
        if (args[2] === undefined || args[2] > this.length) {
            args[2] = this.length;
        }
        if (args[2] <= 0) {
            return "";
        }
        args[2] >>>= 0;
        args[1] >>>= 0;
        if (args[2] <= args[1]) {
            return "";
        }
        if (!args[0]) {
            args[0] = "utf8";
        }
        while(true){
            switch(args[0]){
                case "hex":
                    return Buffer.hexSlice(this, args[1], args[2]);
                case "utf8":
                case "utf-8":
                    return Buffer.utf8Slice(this, args[1], args[2]);
                case "ascii":
                    return Buffer.asciiSlice(this, args[1], args[2]);
                case "latin1":
                case "binary":
                    return Buffer.latin1Slice(this, args[1], args[2]);
                case "base64":
                    return Buffer.base64Slice(this, args[1], args[2]);
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                    return Buffer.utf16leSlice(this, args[1], args[2]);
                default:
                    if (loweredCase) {
                        throw new TypeError("Unknown encoding: " + args[0]);
                    }
                    args[0] = (args[0] + "").toLowerCase();
                    loweredCase = true;
            }
        }
    }
    toString(...args) {
        const length = this.length;
        if (length === 0) {
            return "";
        } else if (args.length === 0) {
            return Buffer.utf8Slice(this, 0, length);
        } else {
            return this.slowToString(...args);
        }
    }
    toLocaleString(...args) {
        return this.toString(...args);
    }
    equals(buf) {
        if (!Buffer.isBuffer(buf)) {
            throw new TypeError("Argument must be a Buffer");
        }
        if (this === buf) return true;
        return Buffer.compare(this, buf) === 0;
    }
    inspect() {
        let str = "";
        const max = 50;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > 50) str += " ... ";
        return "<Buffer " + str + ">";
    }
    compare(...args) {
        if (Buffer.isInstance(args[0], Uint8Array)) {
            args[0] = Buffer.from(args[0], args[0].offset, args[0].byteLength);
        }
        if (!Buffer.isBuffer(args[0])) {
            throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. ' + "Received type " + typeof args[0]);
        }
        if (args[1] === undefined) {
            args[1] = 0;
        }
        if (args[2] === undefined) {
            args[2] = args[0] ? args[0].length : 0;
        }
        if (args[3] === undefined) {
            args[3] = 0;
        }
        if (args[4] === undefined) {
            args[4] = this.length;
        }
        if (args[1] < 0 || args[2] > args[0].length || args[3] < 0 || args[4] > this.length) {
            throw new RangeError("out of range mod.ts");
        }
        if (args[3] >= args[4] && args[1] >= args[2]) {
            return 0;
        }
        if (args[3] >= args[4]) {
            return -1;
        }
        if (args[1] >= args[2]) {
            return 1;
        }
        args[1] >>>= 0;
        args[2] >>>= 0;
        args[3] >>>= 0;
        args[4] >>>= 0;
        if (this === args[0]) {
            return 0;
        }
        let x = args[4] - args[3];
        let y = args[2] - args[1];
        const len7 = Math.min(x, y);
        const thisCopy = this.slice(args[3], args[4]);
        const targetCopy = args[0].slice(args[1], args[2]);
        for(let i18 = 0; i18 < len7; ++i18){
            if (thisCopy[i18] !== targetCopy[i18]) {
                x = thisCopy[i18];
                y = targetCopy[i18];
                break;
            }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
    }
    static arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== undefined) {
            encoding = String(encoding).toLowerCase();
            if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
                if (arr.length < 2 || val.length < 2) {
                    return -1;
                }
                indexSize = 2;
                arrLength /= 2;
                valLength /= 2;
                byteOffset /= 2;
            }
        }
        function read1(buf, i19) {
            if (indexSize === 1) {
                return buf[i19];
            } else {
                return buf.readUInt16BE(i19 * indexSize);
            }
        }
        let i1;
        if (dir) {
            let foundIndex = -1;
            for(i1 = byteOffset; i1 < arrLength; i1++){
                if (read1(arr, i1) === read1(val, foundIndex === -1 ? 0 : i1 - foundIndex)) {
                    if (foundIndex === -1) foundIndex = i1;
                    if (i1 - foundIndex + 1 === valLength) return foundIndex * indexSize;
                } else {
                    if (foundIndex !== -1) i1 -= i1 - foundIndex;
                    foundIndex = -1;
                }
            }
        } else {
            if (byteOffset + valLength > arrLength) {
                byteOffset = arrLength - valLength;
            }
            for(i1 = byteOffset; i1 >= 0; i1--){
                let found = true;
                for(let j = 0; j < valLength; j++){
                    if (read1(arr, i1 + j) !== read1(val, j)) {
                        found = false;
                        break;
                    }
                }
                if (found) return i1;
            }
        }
        return -1;
    }
    static bidirectionalIndexOf(...args) {
        if (args[0].length === 0) return -1;
        if (typeof args[2] === "string") {
            args[3] = args[2];
            args[2] = 0;
        } else if (args[2] > 0x7fffffff) {
            args[2] = 0x7fffffff;
        } else if (args[2] < -0x80000000) {
            args[2] = -0x80000000;
        }
        args[2] = +args[2];
        if (Buffer.numberIsNaN(args[2])) {
            args[2] = args[4] ? 0 : args[0].length - 1;
        }
        if (args[2] < 0) args[2] = args[0].length + args[2];
        if (args[2] >= args[0].length) {
            if (args[4]) return -1;
            else args[2] = args[0].length - 1;
        } else if (args[2] < 0) {
            if (args[4]) args[2] = 0;
            else return -1;
        }
        if (typeof args[1] === "string") {
            args[1] = Buffer.from(args[1], args[3]);
        }
        if (Buffer.isBuffer(args[1])) {
            if (args[1].length === 0) {
                return -1;
            }
            return Buffer.arrayIndexOf(args[0], args[1], args[2], args[3], args[4]);
        } else if (typeof args[1] === "number") {
            args[1] = args[1] & 0xff;
            if (typeof Uint8Array.prototype.indexOf === "function") {
                if (args[4]) {
                    return Uint8Array.prototype.indexOf.call(args[0], args[1], args[2]);
                } else {
                    return Uint8Array.prototype.lastIndexOf.call(args[0], args[1], args[2]);
                }
            }
            return Buffer.arrayIndexOf(args[0], [
                args[1]
            ], args[2], args[3], args[4]);
        }
        throw new TypeError("val must be string, number or Buffer");
    }
    indexOf(val, byteOffset, encoding) {
        return Buffer.bidirectionalIndexOf(this, val, byteOffset, encoding, true);
    }
    lastIndexOf(val, byteOffset, encoding) {
        return Buffer.bidirectionalIndexOf(this, val, byteOffset, encoding, false);
    }
    includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
    }
    toJSON() {
        const facade = this;
        return {
            type: "Buffer",
            data: Array.prototype.slice.call(facade._arr || facade, 0)
        };
    }
    static base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
            return fromByteArray(buf);
        } else {
            return fromByteArray(buf.slice(start, end));
        }
    }
    static utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i20 = start;
        while(i20 < end){
            const firstByte = buf[i20];
            let codePoint = null;
            let bytesPerSequence = firstByte > 0xef ? 4 : firstByte > 0xdf ? 3 : firstByte > 0xbf ? 2 : 1;
            if (i20 + bytesPerSequence <= end) {
                let secondByte, thirdByte, fourthByte, tempCodePoint;
                switch(bytesPerSequence){
                    case 1:
                        if (firstByte < 0x80) {
                            codePoint = firstByte;
                        }
                        break;
                    case 2:
                        secondByte = buf[i20 + 1];
                        if ((secondByte & 0xc0) === 0x80) {
                            tempCodePoint = (firstByte & 0x1f) << 0x6 | secondByte & 0x3f;
                            if (tempCodePoint > 0x7f) {
                                codePoint = tempCodePoint;
                            }
                        }
                        break;
                    case 3:
                        secondByte = buf[i20 + 1];
                        thirdByte = buf[i20 + 2];
                        if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80) {
                            tempCodePoint = (firstByte & 0xf) << 0xc | (secondByte & 0x3f) << 0x6 | thirdByte & 0x3f;
                            if (tempCodePoint > 0x7ff && (tempCodePoint < 0xd800 || tempCodePoint > 0xdfff)) {
                                codePoint = tempCodePoint;
                            }
                        }
                        break;
                    case 4:
                        secondByte = buf[i20 + 1];
                        thirdByte = buf[i20 + 2];
                        fourthByte = buf[i20 + 3];
                        if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80 && (fourthByte & 0xc0) === 0x80) {
                            tempCodePoint = (firstByte & 0xf) << 0x12 | (secondByte & 0x3f) << 0xc | (thirdByte & 0x3f) << 0x6 | fourthByte & 0x3f;
                            if (tempCodePoint > 0xffff && tempCodePoint < 0x110000) {
                                codePoint = tempCodePoint;
                            }
                        }
                }
            }
            if (codePoint === null) {
                codePoint = 0xfffd;
                bytesPerSequence = 1;
            } else if (codePoint > 0xffff) {
                codePoint -= 0x10000;
                res.push(codePoint >>> 10 & 0x3ff | 0xd800);
                codePoint = 0xdc00 | codePoint & 0x3ff;
            }
            res.push(codePoint);
            i20 += bytesPerSequence;
        }
        return Buffer.decodeCodePointsArray(res);
    }
    static decodeCodePointsArray(codePoints) {
        const len8 = codePoints.length;
        if (len8 <= 0x1000) {
            return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i21 = 0;
        while(i21 < len8){
            res += String.fromCharCode.apply(String, codePoints.slice(i21, i21 += MAX_ARGUMENTS_LENGTH));
        }
        return res;
    }
    static asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for(let i22 = start; i22 < end; ++i22){
            ret += String.fromCharCode(buf[i22] & 0x7f);
        }
        return ret;
    }
    static latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for(let i23 = start; i23 < end; ++i23){
            ret += String.fromCharCode(buf[i23]);
        }
        return ret;
    }
    static hexSlice(buf, start, end) {
        const len9 = buf.length;
        if (!start || start < 0) start = 0;
        if (!end || end < 0 || end > len9) end = len9;
        let out = "";
        for(let i24 = start; i24 < end; ++i24){
            out += Buffer.toHex(buf[i24]);
        }
        return out;
    }
    static utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for(let i25 = 0; i25 < bytes.length; i25 += 2){
            res += String.fromCharCode(bytes[i25] + bytes[i25 + 1] * 256);
        }
        return res;
    }
    slice(start, end) {
        const len10 = this.length;
        start = ~~start;
        end = end === undefined ? len10 : ~~end;
        if (start < 0) {
            start += len10;
            if (start < 0) start = 0;
        } else if (start > len10) {
            start = len10;
        }
        if (end < 0) {
            end += len10;
            if (end < 0) end = 0;
        } else if (end > len10) {
            end = len10;
        }
        if (end < start) end = start;
        let facade = this.subarray(start, end);
        facade.__proto__ = Buffer.prototype;
        return facade;
    }
    copy(target, targetStart, start, end) {
        if (!Buffer.isBuffer(target)) {
            throw new TypeError("argument should be a Buffer");
        }
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;
        if (targetStart < 0) {
            throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length) {
            throw new RangeError("Index out of range");
        }
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start) {
            end = target.length - targetStart + start;
        }
        const len11 = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
            this.copyWithin(targetStart, start, end);
        } else if (this === target && start < targetStart && targetStart < end) {
            for(let i26 = len11 - 1; i26 >= 0; --i26){
                target[i26 + targetStart] = this[i26 + start];
            }
        } else {
            Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
        }
        return len11;
    }
    fill(...args) {
        if (typeof args[0] === "string") {
            if (typeof args[1] === "string") {
                args[3] = args[1];
                args[1] = 0;
                args[2] = this.length;
            } else if (typeof args[2] === "string") {
                args[3] = args[2];
                args[2] = this.length;
            }
            if (args[3] !== undefined && typeof args[3] !== "string") {
                throw new TypeError("encoding must be a string");
            }
            if (typeof args[3] === "string" && !Buffer.isEncoding(args[3])) {
                throw new TypeError("Unknown encoding: " + args[3]);
            }
            if (args[0].length === 1) {
                const code1 = args[0].charCodeAt(0);
                if (args[3] === "utf8" && code1 < 128 || args[3] === "latin1") {
                    args[0] = code1;
                }
            }
        } else if (typeof args[0] === "number") {
            args[0] = args[0] & 255;
        }
        if (args[1] < 0 || this.length < args[1] || this.length < args[2]) {
            throw new RangeError("Out of range mod.ts");
        }
        if (args[2] <= args[1]) {
            return this;
        }
        args[1] = args[1] >>> 0;
        args[2] = args[2] === undefined ? this.length : args[2] >>> 0;
        if (!args[0]) args[0] = 0;
        let i27;
        if (typeof args[0] === "number") {
            for(i27 = args[1]; i27 < args[2]; ++i27){
                this[i27] = args[0];
            }
        } else {
            const bytes = Buffer.isBuffer(args[0]) ? args[0] : Buffer.from(args[0], args[3]);
            const len12 = bytes.length;
            if (len12 === 0) {
                throw new TypeError('The value "' + args[0] + '" is invalid for argument "value"');
            }
            for(i27 = 0; i27 < args[2] - args[1]; ++i27){
                this[i27 + args[1]] = bytes[i27 % len12];
            }
        }
        return this;
    }
    static checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0) {
            throw new RangeError("offset is not uint");
        }
        if (offset + ext > length) {
            throw new RangeError("Trying to access beyond Buffer length");
        }
    }
    readUIntLE(offset, byteLength, noAssert) {
        offset = offset >>> 0;
        byteLength = byteLength >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, byteLength, this.length);
        }
        let val = this[offset];
        let mul = 1;
        let i28 = 0;
        while(++i28 < byteLength && (mul *= 0x100)){
            val += this[offset + i28] * mul;
        }
        return val;
    }
    readUIntBE(offset, byteLength, noAssert) {
        offset = offset >>> 0;
        byteLength = byteLength >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, byteLength, this.length);
        }
        let val = this[offset + --byteLength];
        let mul = 1;
        while(byteLength > 0 && (mul *= 0x100)){
            val += this[offset + --byteLength] * mul;
        }
        return val;
    }
    readUInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 1, this.length);
        }
        return this[offset];
    }
    readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 2, this.length);
        }
        return this[offset] | this[offset + 1] << 8;
    }
    readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 2, this.length);
        }
        return this[offset] << 8 | this[offset + 1];
    }
    readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 4, this.length);
        }
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 0x1000000;
    }
    readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 4, this.length);
        }
        return this[offset] * 0x1000000 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
    }
    readIntLE(offset, byteLength, noAssert) {
        offset = offset >>> 0;
        byteLength = byteLength >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, byteLength, this.length);
        }
        let val = this[offset];
        let mul = 1;
        let i29 = 0;
        while(++i29 < byteLength && (mul *= 0x100)){
            val += this[offset + i29] * mul;
        }
        mul *= 0x80;
        if (val >= mul) {
            val -= Math.pow(2, 8 * byteLength);
        }
        return val;
    }
    readIntBE(offset, byteLength, noAssert) {
        offset = offset >>> 0;
        byteLength = byteLength >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, byteLength, this.length);
        }
        let i30 = byteLength;
        let mul = 1;
        let val = this[offset + --i30];
        while(i30 > 0 && (mul *= 0x100)){
            val += this[offset + --i30] * mul;
        }
        mul *= 0x80;
        if (val >= mul) {
            val -= Math.pow(2, 8 * byteLength);
        }
        return val;
    }
    readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 1, this.length);
        }
        if (!(this[offset] & 0x80)) {
            return this[offset];
        }
        return (0xff - this[offset] + 1) * -1;
    }
    readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 2, this.length);
        }
        const val = this[offset] | this[offset + 1] << 8;
        return val & 0x8000 ? val | 0xffff0000 : val;
    }
    readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 2, this.length);
        }
        const val = this[offset + 1] | this[offset] << 8;
        return val & 0x8000 ? val | 0xffff0000 : val;
    }
    readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 4, this.length);
        }
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
    }
    readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 4, this.length);
        }
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
    }
    readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 4, this.length);
        }
        const facade = this;
        return read(facade, offset, true, 23, 4);
    }
    readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 4, this.length);
        }
        const facade = this;
        return read(facade, offset, false, 23, 4);
    }
    readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 8, this.length);
        }
        const facade = this;
        return read(facade, offset, true, 52, 8);
    }
    readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkOffset(offset, 8, this.length);
        }
        const facade = this;
        return read(facade, offset, false, 52, 8);
    }
    static hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length) {
            length = remaining;
        } else {
            length = Number(length);
            if (length > remaining) {
                length = remaining;
            }
        }
        const strLen = string.length;
        if (length > strLen / 2) {
            length = strLen / 2;
        }
        let i31 = 0;
        for(i31 = 0; i31 < length; ++i31){
            const parsed = parseInt(string.substr(i31 * 2, 2), 16);
            if (Buffer.numberIsNaN(parsed)) return i31;
            buf[offset + i31] = parsed;
        }
        return i31;
    }
    static utf8Write(buf, str, offset, length) {
        return Buffer.blitBuffer(Buffer.utf8ToBytes(str, buf.length - offset), buf, offset, length);
    }
    static asciiWrite(buf, str, offset, length) {
        return Buffer.blitBuffer(Buffer.asciiToBytes(str), buf, offset, length);
    }
    static latin1Write(buf, str, offset, length) {
        return Buffer.asciiWrite(buf, str, offset, length);
    }
    static base64Write(buf, str, offset, length) {
        return Buffer.blitBuffer(Buffer.base64ToBytes(str), buf, offset, length);
    }
    static ucs2Write(buf, str, offset, length) {
        return Buffer.blitBuffer(Buffer.utf16leToBytes(str, buf.length - offset), buf, offset, length);
    }
    write(...args) {
        if (args[1] === undefined) {
            args[3] = "utf8";
            args[2] = this.length;
            args[1] = 0;
        } else if (args[2] === undefined && typeof args[1] === "string") {
            args[3] = args[1];
            args[2] = this.length;
            args[1] = 0;
        } else if (isFinite(args[1])) {
            args[1] = args[1] >>> 0;
            if (isFinite(args[2])) {
                args[2] = args[2] >>> 0;
                if (args[3] === undefined) args[3] = "utf8";
            } else {
                args[3] = args[2];
                args[2] = undefined;
            }
        } else {
            throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
        }
        const remaining = this.length - args[1];
        if (args[2] === undefined || args[2] > remaining) args[2] = remaining;
        if (args[0].length > 0 && (args[2] < 0 || args[1] < 0) || args[1] > this.length) {
            throw new RangeError("Attempt to write outside Buffer bounds");
        }
        if (!args[3]) {
            args[3] = "utf8";
        }
        let loweredCase = false;
        for(;;){
            switch(args[3]){
                case "hex":
                    return Buffer.hexWrite(this, args[0], args[1], args[2]);
                case "utf8":
                case "utf-8":
                    return Buffer.utf8Write(this, args[0], args[1], args[2]);
                case "ascii":
                    return Buffer.asciiWrite(this, args[0], args[1], args[2]);
                case "latin1":
                case "binary":
                    return Buffer.latin1Write(this, args[0], args[1], args[2]);
                case "base64":
                    return Buffer.base64Write(this, args[0], args[1], args[2]);
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                    return Buffer.ucs2Write(this, args[0], args[1], args[2]);
                default:
                    if (loweredCase) {
                        throw new TypeError("Unknown encoding: " + args[3]);
                    }
                    args[3] = ("" + args[3]).toLowerCase();
                    loweredCase = true;
            }
        }
    }
    static checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer.isBuffer(buf)) {
            throw new TypeError('"Buffer" argument must be a Buffer instance');
        }
        if (value > max || value < min) {
            throw new RangeError('"value" argument is out of bounds');
        }
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
    }
    writeUIntLE(value, offset, byteLength, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength = byteLength >>> 0;
        if (!noAssert) {
            const maxBytes = Math.pow(2, 8 * byteLength) - 1;
            Buffer.checkInt(this, value, offset, byteLength, maxBytes, 0);
        }
        let mul = 1;
        let i32 = 0;
        this[offset] = value & 0xff;
        while(++i32 < byteLength && (mul *= 0x100)){
            this[offset + i32] = value / mul & 0xff;
        }
        return offset + byteLength;
    }
    writeUIntBE(value, offset, byteLength, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength = byteLength >>> 0;
        if (!noAssert) {
            const maxBytes = Math.pow(2, 8 * byteLength) - 1;
            Buffer.checkInt(this, value, offset, byteLength, maxBytes, 0);
        }
        let i33 = byteLength - 1;
        let mul = 1;
        this[offset + i33] = value & 0xff;
        while(--i33 >= 0 && (mul *= 0x100)){
            this[offset + i33] = value / mul & 0xff;
        }
        return offset + byteLength;
    }
    writeUInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 1, 0xff, 0);
        }
        this[offset] = value & 0xff;
        return offset + 1;
    }
    writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 2, 0xffff, 0);
        }
        this[offset] = value & 0xff;
        this[offset + 1] = value >>> 8;
        return offset + 2;
    }
    writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 2, 0xffff, 0);
        }
        this[offset] = value >>> 8;
        this[offset + 1] = value & 0xff;
        return offset + 2;
    }
    writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 4, 0xffffffff, 0);
        }
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 0xff;
        return offset + 4;
    }
    writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 4, 0xffffffff, 0);
        }
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 0xff;
        return offset + 4;
    }
    writeIntLE(value, offset, byteLength, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            const limit = Math.pow(2, 8 * byteLength - 1);
            Buffer.checkInt(this, value, offset, byteLength, limit - 1, -limit);
        }
        let i34 = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value & 0xff;
        while(++i34 < byteLength && (mul *= 0x100)){
            if (value < 0 && sub === 0 && this[offset + i34 - 1] !== 0) {
                sub = 1;
            }
            this[offset + i34] = (value / mul >> 0) - sub & 0xff;
        }
        return offset + byteLength;
    }
    writeIntBE(value, offset, byteLength, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            const limit = Math.pow(2, 8 * byteLength - 1);
            Buffer.checkInt(this, value, offset, byteLength, limit - 1, -limit);
        }
        let i35 = byteLength - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i35] = value & 0xff;
        while(--i35 >= 0 && (mul *= 0x100)){
            if (value < 0 && sub === 0 && this[offset + i35 + 1] !== 0) {
                sub = 1;
            }
            this[offset + i35] = (value / mul >> 0) - sub & 0xff;
        }
        return offset + byteLength;
    }
    writeInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 1, 0x7f, -0x80);
        }
        if (value < 0) value = 0xff + value + 1;
        this[offset] = value & 0xff;
        return offset + 1;
    }
    writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 2, 0x7fff, -0x8000);
        }
        this[offset] = value & 0xff;
        this[offset + 1] = value >>> 8;
        return offset + 2;
    }
    writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 2, 0x7fff, -0x8000);
        }
        this[offset] = value >>> 8;
        this[offset + 1] = value & 0xff;
        return offset + 2;
    }
    writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
        }
        this[offset] = value & 0xff;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
    }
    writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
        }
        if (value < 0) value = 0xffffffff + value + 1;
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 0xff;
        return offset + 4;
    }
    static checkIEEE754(buf, _value, offset, ext, _max, _min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
    }
    static writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkIEEE754(buf, value, offset, 4, 3.4028234663852886e38, -3.4028234663852886e38);
        }
        write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
    }
    writeFloatLE(value, offset, noAssert) {
        return Buffer.writeFloat(this, value, offset, true, noAssert);
    }
    writeFloatBE(value, offset, noAssert) {
        return Buffer.writeFloat(this, value, offset, false, noAssert);
    }
    static writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
            Buffer.checkIEEE754(buf, value, offset, 8, 1.7976931348623157e308, -1.7976931348623157e308);
        }
        write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
    }
    writeDoubleLE(value, offset, noAssert) {
        return Buffer.writeDouble(this, value, offset, true, noAssert);
    }
    writeDoubleBE(value, offset, noAssert) {
        return Buffer.writeDouble(this, value, offset, false, noAssert);
    }
    static allocUnsafe(size) {
        Buffer.assertSize(size);
        return Buffer.createBuffer(size < 0 ? 0 : Buffer.checked(size) | 0);
    }
    static alloc(size, fill, encoding) {
        Buffer.assertSize(size);
        if (size <= 0) {
            return Buffer.createBuffer(size);
        }
        if (fill !== undefined) {
            return typeof encoding === "string" ? Buffer.createBuffer(size).fill(fill, encoding) : Buffer.createBuffer(size).fill(fill);
        }
        return Buffer.createBuffer(size);
    }
    static fromString(str, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
            encoding = "utf8";
        }
        if (!Buffer.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
        }
        const length = Buffer.byteLength(str, encoding) | 0;
        let buf = Buffer.createBuffer(length);
        const actual = buf.write(str, encoding);
        if (actual !== length) {
            buf = buf.slice(0, actual);
        }
        return buf;
    }
    static fromArrayLike(array) {
        const length = array.length < 0 ? 0 : Buffer.checked(array.length) | 0;
        const buf = Buffer.createBuffer(length);
        for(let i36 = 0; i36 < length; i36 += 1){
            buf[i36] = array[i36] & 255;
        }
        return buf;
    }
    static fromArrayBuffer(array, byteOffset, length) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
            throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array.byteLength < byteOffset + (length || 0)) {
            throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === undefined && length === undefined) {
            buf = new Uint8Array(array);
        } else if (length === undefined) {
            buf = new Uint8Array(array, byteOffset);
        } else {
            buf = new Uint8Array(array, byteOffset, length);
        }
        const facade = buf;
        facade.__proto__ = Buffer.prototype;
        return facade;
    }
    static fromObject(obj) {
        if (Buffer.isBuffer(obj)) {
            const len13 = Buffer.checked(obj.length) | 0;
            const buf = Buffer.createBuffer(len13);
            if (buf.length === 0) {
                return buf;
            }
            obj.copy(buf, 0, 0, len13);
            return buf;
        }
        if (obj.length !== undefined) {
            if (typeof obj.length !== "number" || Buffer.numberIsNaN(obj.length)) {
                return Buffer.createBuffer(0);
            }
            return Buffer.fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
            return Buffer.fromArrayLike(obj.data);
        }
        throw TypeError("Unable create buffer from given object.");
    }
    static from(...args) {
        if (typeof args[0] === "string") {
            return Buffer.fromString(args[0], args[1]);
        }
        if (ArrayBuffer.isView(args[0])) {
            return Buffer.fromArrayLike(args[0]);
        }
        if (args[0] == null) {
            throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, " + "or Array-like Object. Received type " + typeof args[0]);
        }
        if (Buffer.isInstance(args[0], ArrayBuffer) || args[0] && Buffer.isInstance(args[0].buffer, ArrayBuffer)) {
            return Buffer.fromArrayBuffer(args[0], args[1], args[2]);
        }
        if (typeof args[0] === "number") {
            throw new TypeError('The "value" argument must not be of type number. Received type number');
        }
        const valueOf = args[0].valueOf && args[0].valueOf();
        if (valueOf != null && valueOf !== args[0]) {
            return Buffer.from(args[0], args[1], args[2]);
        }
        const b = Buffer.fromObject(args[0]);
        if (b) return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof args[0][Symbol.toPrimitive] === "function") {
            return Buffer.from(args[0][Symbol.toPrimitive]("string"), args[1], args[2]);
        }
        throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, " + "or Array-like Object. Received type " + typeof args[0]);
    }
    static isBuffer(b) {
        return b instanceof Buffer;
    }
    static byteLength(...args) {
        if (Buffer.isBuffer(args[0])) {
            return args[0].length;
        }
        if (ArrayBuffer.isView(args[0]) || Buffer.isInstance(args[0], ArrayBuffer)) {
            return args[0].byteLength;
        }
        if (typeof args[0] !== "string") {
            throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' + "Received type " + typeof args[0]);
        }
        const len14 = args[0].length;
        const mustMatch = args.length > 2 && args[2] === true;
        if (!mustMatch && len14 === 0) return 0;
        let loweredCase = false;
        for(;;){
            switch(args[1]){
                case "ascii":
                case "latin1":
                case "binary":
                    return len14;
                case "utf8":
                case "utf-8":
                    return Buffer.utf8ToBytes(args[0]).length;
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                    return len14 * 2;
                case "hex":
                    return len14 >>> 1;
                case "base64":
                    return Buffer.base64ToBytes(args[0]).length;
                default:
                    if (loweredCase) {
                        return mustMatch ? -1 : Buffer.utf8ToBytes(args[0]).length;
                    }
                    args[1] = ("" + args[1]).toLowerCase();
                    loweredCase = true;
            }
        }
    }
    static compare(a, b) {
        if (Buffer.isInstance(a, Uint8Array)) {
            a = Buffer.from(a, a.byteOffset, a.byteLength);
        }
        if (Buffer.isInstance(b, Uint8Array)) {
            b = Buffer.from(b, b.byteOffset, b.byteLength);
        }
        if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
            throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
        }
        if (a === b) return 0;
        let x = a.length;
        let y = b.length;
        for(let i37 = 0, len15 = Math.min(x, y); i37 < len15; ++i37){
            if (a[i37] !== b[i37]) {
                x = a[i37];
                y = b[i37];
                break;
            }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
    }
    static isEncoding(encoding) {
        switch(String(encoding).toLowerCase()){
            case "hex":
            case "utf8":
            case "utf-8":
            case "ascii":
            case "latin1":
            case "binary":
            case "base64":
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
                return true;
            default:
                return false;
        }
    }
    static concat(list, length) {
        if (!Array.isArray(list)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
            return Buffer.alloc(0);
        }
        let i38;
        if (length === undefined) {
            length = 0;
            for(i38 = 0; i38 < list.length; ++i38){
                length += list[i38].length;
            }
        }
        const buffer = Buffer.allocUnsafe(length);
        let pos = 0;
        for(i38 = 0; i38 < list.length; ++i38){
            let buf = list[i38];
            if (Buffer.isInstance(buf, Uint8Array)) {
                buf = Buffer.from(buf);
            }
            if (!Buffer.isBuffer(buf)) {
                throw new TypeError('"list" argument must be an Array of Buffers');
            }
            buf.copy(buffer, pos);
            pos += buf.length;
        }
        return buffer;
    }
    static assertSize(size) {
        if (typeof size !== "number") {
            throw new TypeError(`'size' argument must be of type number`);
        } else if (size < 0) {
            throw new RangeError(`The value '${size}' is invalid for option "size"`);
        }
    }
    static createBuffer(length) {
        if (length > 0x7fffffff) {
            throw new RangeError('The value "' + length + '" is invalid for option "size"');
        }
        return new Buffer(length);
    }
    static checked(length) {
        if (length >= 0x7fffffff) {
            throw new RangeError(`Attempt to allocate Buffer larger than maximum ` + `size: 0x${0x7fffffff.toString(16)} bytes`);
        }
        return length | 0;
    }
    static base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while(str.length % 4 !== 0){
            str = str + "=";
        }
        return str;
    }
    static toHex(n) {
        if (n < 16) return "0" + n.toString(16);
        return n.toString(16);
    }
    static utf8ToBytes(str, units) {
        units = units || Infinity;
        let codePoint;
        const length = str.length;
        let leadSurrogate = null;
        const bytes = [];
        for(let i39 = 0; i39 < length; ++i39){
            codePoint = str.charCodeAt(i39);
            if (codePoint > 0xd7ff && codePoint < 0xe000) {
                if (!leadSurrogate) {
                    if (codePoint > 0xdbff) {
                        if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                        continue;
                    } else if (i39 + 1 === length) {
                        if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                        continue;
                    }
                    leadSurrogate = codePoint;
                    continue;
                }
                if (codePoint < 0xdc00) {
                    if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                    leadSurrogate = codePoint;
                    continue;
                }
                codePoint = (leadSurrogate - 0xd800 << 10 | codePoint - 0xdc00) + 0x10000;
            } else if (leadSurrogate) {
                if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
            }
            leadSurrogate = null;
            if (codePoint < 0x80) {
                if ((units -= 1) < 0) break;
                bytes.push(codePoint);
            } else if (codePoint < 0x800) {
                if ((units -= 2) < 0) break;
                bytes.push(codePoint >> 0x6 | 0xc0, codePoint & 0x3f | 0x80);
            } else if (codePoint < 0x10000) {
                if ((units -= 3) < 0) break;
                bytes.push(codePoint >> 0xc | 0xe0, codePoint >> 0x6 & 0x3f | 0x80, codePoint & 0x3f | 0x80);
            } else if (codePoint < 0x110000) {
                if ((units -= 4) < 0) break;
                bytes.push(codePoint >> 0x12 | 0xf0, codePoint >> 0xc & 0x3f | 0x80, codePoint >> 0x6 & 0x3f | 0x80, codePoint & 0x3f | 0x80);
            } else {
                throw new Error("Invalid code point");
            }
        }
        return bytes;
    }
    static asciiToBytes(str) {
        const byteArray = [];
        for(let i40 = 0; i40 < str.length; ++i40){
            byteArray.push(str.charCodeAt(i40) & 0xff);
        }
        return byteArray;
    }
    static utf16leToBytes(str, units) {
        let c, hi, lo;
        const byteArray = [];
        for(let i41 = 0; i41 < str.length; ++i41){
            if ((units -= 2) < 0) {
                break;
            }
            c = str.charCodeAt(i41);
            hi = c >> 8;
            lo = c % 256;
            byteArray.push(lo);
            byteArray.push(hi);
        }
        return byteArray;
    }
    static base64ToBytes(str) {
        return toByteArray(Buffer.base64clean(str));
    }
    static blitBuffer(src, dst, offset, length) {
        let i42 = 0;
        for(i42 = 0; i42 < length; ++i42){
            if (i42 + offset >= dst.length || i42 >= src.length) break;
            dst[i42 + offset] = src[i42];
        }
        return i42;
    }
    static isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
    }
    static numberIsNaN(obj) {
        return obj !== obj;
    }
}
class Writable {
    semaphore;
    controller;
    error;
    constructor(sink){
        this.sink = sink;
        this.controller = {};
        this.semaphore = new Semaphore(1);
        this.start();
    }
    async start() {
        if (this.sink.start) {
            try {
                await this.semaphore.run(()=>this.sink.start(this.controller));
            } catch (error) {
                this.error = error;
                throw error;
            }
        }
    }
    async write(data) {
        if (this.error !== undefined) {
            throw this.error;
        }
        if (this.sink.write) {
            try {
                await this.semaphore.run(()=>this.sink.write(data, this.controller));
            } catch (error) {
                this.error = error;
                throw error;
            }
        }
    }
    async abort(error = new Error("abort")) {
        if (this.error !== undefined) {
            throw this.error;
        }
        if (this.sink.abort) {
            try {
                await this.semaphore.run(()=>this.sink.abort(error));
            } catch (error) {
                this.error = error;
                throw error;
            }
        }
    }
    async close() {
        if (this.error !== undefined) {
            throw this.error;
        }
        if (this.sink.close) {
            try {
                await this.semaphore.run(()=>this.sink.close());
            } catch (error) {
                this.error = error;
                throw error;
            }
        }
    }
    sink;
}
class ReadableAsyncIterator {
    constructor(readable){
        this.readable = readable;
    }
    async next() {
        return this.readable.read();
    }
    readable;
}
class Readable {
    [Symbol.asyncIterator]() {
        return new ReadableAsyncIterator(this);
    }
    stream;
    reader;
    constructor(source){
        this.stream = new ReadableStream(source);
        this.reader = this.stream.getReader();
    }
    async read() {
        return this.reader.read();
    }
    cancel() {
        return this.reader.cancel();
    }
    async pipe(writable) {
        while(true){
            const { done , value  } = await this.read();
            if (done) {
                return writable.close();
            }
            try {
                await writable.write(value);
            } catch (error) {
                await writable.abort(error);
                throw error;
            }
        }
    }
}
class Queryable {
    [Symbol.asyncIterator]() {
        async function* generator(iterable) {
            for await (const element of iterable){
                yield element;
            }
        }
        return generator(this.iterable);
    }
    constructor(iterable){
        this.iterable = iterable;
    }
    concat(queryable) {
        async function* generator(iterable) {
            for await (const element of iterable){
                yield element;
            }
            for await (const element1 of queryable.iterable){
                yield element1;
            }
        }
        return new Queryable(generator(this.iterable));
    }
    distinct(func) {
        func = func || ((value)=>value);
        const accu = [];
        async function* generator(iterable) {
            for await (const element of iterable){
                const key = func(element);
                if (accu.indexOf(key) === -1) {
                    accu.push(key);
                    yield element;
                }
            }
        }
        return new Queryable(generator(this.iterable));
    }
    async elementAt(index) {
        const array = await this.toArray();
        return array[index];
    }
    async first() {
        const array = await this.toArray();
        return array[0];
    }
    async last() {
        const array = await this.toArray();
        return array[array.length - 1];
    }
    ordering(direction, func) {
        async function* generator(iterable) {
            const array = [];
            for await (const element of iterable){
                array.push(element);
            }
            const sorted = array.sort((a, b)=>{
                const left = func(a);
                const right = func(b);
                return direction === "asc" ? +(left > right) || +(left === right) - 1 : +(left < right) || +(left === right) - 1;
            });
            for (const element2 of sorted){
                yield element2;
            }
        }
        return new Queryable(generator(this.iterable));
    }
    orderBy(func) {
        return this.ordering("asc", func);
    }
    orderByDescending(func) {
        return this.ordering("desc", func);
    }
    reverse() {
        async function* generator(iterable) {
            const array = [];
            for await (const element of iterable){
                array.push(element);
            }
            for(let i43 = array.length - 1; i43 !== 0; i43--){
                yield array[i43];
            }
        }
        return new Queryable(generator(this.iterable));
    }
    select(func) {
        async function* generator(iterable) {
            let index = 0;
            for await (const element of iterable){
                yield func(element, index++);
            }
        }
        return new Queryable(generator(this.iterable));
    }
    selectMany(func) {
        async function* generator(iterable) {
            let index = 0;
            for await (const element0 of iterable){
                for await (const element1 of func(element0, index++)){
                    yield element1;
                }
            }
        }
        return new Queryable(generator(this.iterable));
    }
    skip(count) {
        async function* generator(iterable) {
            let index = 0;
            for await (const element of iterable){
                if (index >= count) {
                    yield element;
                }
                index += 1;
            }
        }
        return new Queryable(generator(this.iterable));
    }
    take(count) {
        async function* generator(iterable) {
            let index = 0;
            for await (const element of iterable){
                if (index < count) {
                    yield element;
                }
                index += 1;
            }
        }
        return new Queryable(generator(this.iterable));
    }
    where(func) {
        async function* generator(iterable) {
            let index = 0;
            for await (const element of iterable){
                if (func(element, index++)) {
                    yield element;
                }
            }
        }
        return new Queryable(generator(this.iterable));
    }
    async aggregate(func, initial) {
        const array = await this.toArray();
        return array.reduce(func, initial);
    }
    async all(func) {
        const array = await this.toArray();
        return array.every(func);
    }
    async average(func) {
        const array = await this.toArray();
        const sum = array.map(func).reduce((acc, c)=>acc + c, 0);
        return sum / array.length;
    }
    async any(func) {
        const array = await this.toArray();
        return array.some(func);
    }
    async count() {
        let count = 0;
        for await (const _value of this.iterable){
            count += 1;
        }
        return count;
    }
    async sum(func) {
        const array = await this.toArray();
        return array.reduce((acc, c, index)=>acc + func(c, index), 0);
    }
    async toArray() {
        const buffer = [];
        for await (const element of this.iterable){
            buffer.push(element);
        }
        return buffer;
    }
    iterable;
}
class System {
    started;
    constructor(net){
        this.net = net;
        this.started = new Date();
    }
    uptime() {
        const started = this.started.getTime();
        const now = Date.now();
        return now - started;
    }
    async getNetStat(peer) {
        const local = peer.local;
        const remote = peer.remote;
        const loopback = peer.loopback;
        const transceivers = peer.connection.getTransceivers().length;
        const senders = peer.connection.getSenders().length;
        const stats = await peer.connection.getStats();
        const info = {};
        stats.forEach((value)=>{
            Object.keys(value).forEach((key)=>{
                info[key] = value[key];
            });
        });
        return {
            local,
            remote,
            loopback,
            transceivers,
            senders,
            ...info
        };
    }
    async netstat() {
        const peers = this.net.getPeers();
        const stats = [];
        for (const key of peers.keys()){
            const peer = peers.get(key);
            const stat = await this.getNetStat(peer);
            stats.push(stat);
        }
        return stats;
    }
    net;
}
const DBFactory = ()=>{
    const host = window;
    return host.indexedDB || host.mozIndexedDB || host.webkitIndexedDB || host.msIndexedDB || host.shimIndexedDB;
};
class Semaphore1 {
    awaiters;
    running;
    constructor(){
        this.awaiters = [];
        this.running = false;
    }
    run(func) {
        return new Promise((resolve, reject)=>{
            this.awaiters.push({
                func,
                resolve,
                reject
            });
            this.dispatch();
        });
    }
    async dispatch() {
        if (this.running || this.awaiters.length === 0) {
            return;
        }
        const awaiter = this.awaiters.shift();
        this.running = true;
        try {
            awaiter.resolve(await awaiter.func());
            setTimeout(()=>{
                this.running = false;
                this.dispatch();
            }, 0);
        } catch (error) {
            awaiter.reject(error);
            setTimeout(()=>{
                this.running = false;
                this.dispatch();
            }, 0);
        }
    }
}
class ReaderAsyncIterator {
    constructor(reader){
        this.reader = reader;
    }
    async next() {
        const next = await this.reader.read();
        if (next === null) {
            return {
                done: true,
                value: null
            };
        }
        const value = next;
        return {
            done: false,
            value
        };
    }
    reader;
}
class Reader {
    [Symbol.asyncIterator]() {
        return new ReaderAsyncIterator(this);
    }
    deferreds = [];
    values = [];
    ended = false;
    resolve() {
        if (this.values.length > 0 && this.deferreds.length > 0) {
            const deferred = this.deferreds.shift();
            const value = this.values.shift();
            if (value !== null && value.record === null) {
                this.ended = true;
            }
            return value.error ? deferred.reject(value.error) : deferred.resolve(value.record);
        }
    }
    write(record) {
        this.values.push({
            record
        });
        this.resolve();
    }
    error(error) {
        this.values.push({
            error
        });
        this.resolve();
    }
    read() {
        if (this.ended) {
            return Promise.resolve(null);
        }
        const promise = new Promise((resolve, reject)=>{
            this.deferreds.push({
                resolve,
                reject
            });
        });
        this.resolve();
        return promise;
    }
}
class IDBDriver {
    semaphore;
    constructor(database){
        this.database = database;
        this.semaphore = new Semaphore1();
    }
    add(storeKeys) {
        return this.semaphore.run(async ()=>{
            for (const storeKey of storeKeys){
                const name = this.database.name;
                const version = this.database.version;
                if (!this.stores().includes(storeKey)) {
                    this.database.close();
                    this.database = await IDBDriver.open(name, {
                        version: version + 1,
                        additions: [
                            storeKey
                        ],
                        removals: []
                    });
                }
            }
        });
    }
    remove(storeKeys) {
        return this.semaphore.run(async ()=>{
            for (const storeKey of storeKeys){
                const name = this.database.name;
                const version = this.database.version;
                if (this.stores().includes(storeKey)) {
                    this.database.close();
                    this.database = await IDBDriver.open(name, {
                        version: version + 1,
                        additions: [],
                        removals: [
                            storeKey
                        ]
                    });
                }
            }
        });
    }
    name() {
        return this.database.name;
    }
    version() {
        return this.database.version;
    }
    stores() {
        const stores = [];
        for(let i44 = 0; i44 < this.database.objectStoreNames.length; i44++){
            stores.push(this.database.objectStoreNames[i44]);
        }
        return stores;
    }
    get(storeKey, recordKey) {
        return this.semaphore.run(()=>new Promise((resolve, reject)=>{
                const transaction = this.database.transaction([
                    storeKey
                ], "readonly");
                const store = transaction.objectStore(storeKey);
                const request = store.get(recordKey);
                request.addEventListener("success", ()=>resolve(request.result));
                request.addEventListener("error", ()=>reject(request.error));
            }));
    }
    count(storeKey) {
        return this.semaphore.run(()=>new Promise((resolve, reject)=>{
                const transaction = this.database.transaction([
                    storeKey
                ], "readonly");
                const store = transaction.objectStore(storeKey);
                const request = store.count();
                request.addEventListener("success", ()=>resolve(request.result));
                request.addEventListener("error", ()=>reject(request.error));
            }));
    }
    read(storeKey) {
        const reader = new Reader();
        const transaction = this.database.transaction([
            storeKey
        ], "readonly");
        transaction.addEventListener("error", ()=>reader.error(transaction.error));
        transaction.addEventListener("complete", ()=>reader.write(null));
        const store = transaction.objectStore(storeKey);
        const request = store.openCursor();
        request.addEventListener("error", ()=>reader.error(request.error));
        request.addEventListener("success", (event)=>{
            const cursor = event.target.result;
            if (cursor) {
                reader.write(cursor.value);
                cursor.continue();
            }
        });
        return reader;
    }
    transactUpdateRecordCursors(transaction, storeKey, records) {
        return new Promise((resolve, reject)=>{
            const store = transaction.objectStore(storeKey);
            const request = store.openCursor();
            request.addEventListener("error", ()=>reject(transaction.error));
            request.addEventListener("success", (event)=>{
                const cursor = event.target.result;
                if (cursor === null) {
                    resolve();
                    return;
                }
                for (const record of records){
                    if (record.key === cursor.key) {
                        cursor.update(record);
                        cursor.continue();
                        return;
                    }
                }
                cursor.continue();
            });
        });
    }
    transactUpdateRecords(transaction, updates) {
        return Promise.all([
            ...updates.keys()
        ].map((storeKey)=>{
            const records = updates.get(storeKey);
            return this.transactUpdateRecordCursors(transaction, storeKey, records);
        }));
    }
    transactInsertRecords(transaction, inserts) {
        for (const storeKey of inserts.keys()){
            const store = transaction.objectStore(storeKey);
            const records = inserts.get(storeKey);
            records.forEach((record)=>store.add(record));
        }
    }
    transactDeleteRecords(transaction, deletes) {
        for (const storeKey of deletes.keys()){
            const store = transaction.objectStore(storeKey);
            const records = deletes.get(storeKey);
            records.forEach((record)=>store.delete(record.key));
        }
    }
    transact(transact) {
        return this.semaphore.run(()=>new Promise(async (resolve, reject)=>{
                const storeKeys = [
                    ...transact.inserts.keys(),
                    ...transact.deletes.keys(),
                    ...transact.updates.keys(), 
                ].filter((value, index, result)=>result.indexOf(value) === index);
                if (storeKeys.length === 0) {
                    resolve();
                    return;
                }
                const transaction = this.database.transaction(storeKeys, "readwrite");
                transaction.addEventListener("error", (error)=>reject(error.target.error));
                transaction.addEventListener("complete", ()=>resolve());
                if ([
                    ...transact.inserts.keys()
                ].length > 0) {
                    this.transactInsertRecords(transaction, transact.inserts);
                }
                if ([
                    ...transact.updates.keys()
                ].length > 0) {
                    await this.transactUpdateRecords(transaction, transact.updates);
                }
                if ([
                    ...transact.deletes.keys()
                ].length > 0) {
                    this.transactDeleteRecords(transaction, transact.deletes);
                }
            }));
    }
    close() {
        this.database.close();
    }
    static open(databaseKey, options = {
        additions: [],
        removals: []
    }) {
        return new Promise((resolve, reject)=>{
            const request = DBFactory().open(databaseKey, options.version);
            request.addEventListener("error", ()=>reject(request.error));
            request.addEventListener("success", ()=>resolve(request.result));
            request.addEventListener("upgradeneeded", ()=>{
                const updated = request.result;
                options.additions.forEach((storeKey)=>updated.createObjectStore(storeKey, {
                        keyPath: "key"
                    }));
                options.removals.forEach((storeKey)=>updated.deleteObjectStore(storeKey));
            });
        });
    }
    static async connect(databaseKey) {
        const database = await IDBDriver.open(databaseKey);
        return new IDBDriver(database);
    }
    static drop(databaseKey) {
        return new Promise((resolve, reject)=>{
            const request = DBFactory().deleteDatabase(databaseKey);
            request.addEventListener("error", ()=>reject(request.error));
            request.addEventListener("success", ()=>resolve());
        });
    }
    database;
}
const Bus = new Events();
class Socket extends Events {
    disposed;
    constructor(sendFunction, closeFunction){
        super();
        this.sendFunction = sendFunction;
        this.closeFunction = closeFunction;
        this.disposed = false;
    }
    once(event, func) {
        super.once(event, func);
    }
    on(event, func) {
        super.on(event, func);
    }
    send(data) {
        if (this.disposed) {
            throw Error("cannot send to disposed socket.");
        }
        this.sendFunction(data);
    }
    close() {
        this.dispose();
    }
    dispose() {
        if (!this.disposed) {
            this.disposed = true;
            this.closeFunction();
            super.dispose();
        }
    }
    static connect(port) {
        let channel;
        const socket = new Socket((message)=>setTimeout(()=>{
                Bus.emit(`${port}:${channel}:server:message`, message);
            }, 0), ()=>setTimeout(()=>{
                Bus.emit(`${port}:${channel}:server:close`);
                socket.dispose();
            }, 0));
        const timeout1 = setTimeout(()=>{
            socket.emit("error", new Error("socket connect timeout"));
            socket.emit("close");
            socket.dispose();
        }, 100);
        setTimeout(()=>{
            Bus.emit(`${port}:server:connect`);
            Bus.once(`${port}:client:connect`, (ch)=>{
                channel = ch;
                clearTimeout(timeout1);
                Bus.on(`${port}:${channel}:client:message`, (data)=>{
                    socket.emit("message", {
                        data
                    });
                });
                Bus.on(`${port}:${channel}:client:close`, ()=>{
                    socket.emit("close");
                    socket.dispose();
                });
                socket.emit("open");
            });
        });
        return socket;
    }
    sendFunction;
    closeFunction;
}
class Server {
    sockets;
    channel;
    constructor(func){
        this.func = func;
        this.channel = 0;
        this.sockets = new Map();
    }
    listen(port) {
        Bus.on(`${port}:server:connect`, (_data)=>{
            const channel = this.channel;
            const socket = new Socket((data)=>setTimeout(()=>{
                    Bus.emit(`${port}:${channel}:client:message`, data);
                }, 0), ()=>setTimeout(()=>{
                    Bus.emit(`${port}:${channel}:client:close`);
                    socket.dispose();
                }, 0));
            Bus.on(`${port}:${channel}:server:message`, (data)=>{
                socket.emit("message", {
                    data
                });
            });
            Bus.on(`${port}:${channel}:server:close`, ()=>{
                this.sockets.delete(channel);
                socket.emit("close");
                socket.dispose();
            });
            this.sockets.set(channel, socket);
            Bus.emit(`${port}:client:connect`, channel);
            this.func(socket);
            this.channel += 1;
        });
        return this;
    }
    dispose() {
        for (const channel of this.sockets.keys()){
            const socket = this.sockets.get(channel);
            socket.emit("close");
            socket.dispose();
            this.sockets.delete(channel);
        }
    }
    func;
}
function createServer(func) {
    return new Server(func);
}
function connect(port) {
    return Socket.connect(port);
}
class Dhcp {
    element;
    constructor(){
        this.element = new Uint32Array(1);
        this.element[0] = 0;
    }
    next() {
        const buffer = new Uint8Array(this.element.buffer);
        const result = [
            ...buffer
        ].join(".");
        this.element[0] += 1;
        return result;
    }
}
class PageHubServer {
    server;
    sockets;
    dhcp;
    constructor(configuration){
        this.configuration = configuration;
        this.sockets = new Map();
        this.dhcp = new Dhcp();
    }
    onConnection(socket) {
        const configuration = this.configuration;
        const address = this.dhcp.next();
        const type = "binding";
        socket.on("message", (message)=>this.onMessage(address, message));
        socket.on("error", (error)=>this.onError(address, error));
        socket.on("close", ()=>this.onClose(address));
        socket.send(JSON.stringify({
            type,
            address,
            configuration
        }));
        this.sockets.set(address, socket);
    }
    onMessage(address, data) {
        try {
            const message = JSON.parse(data.data);
            switch(message.type){
                case "forward":
                    return this.onForward(address, message);
            }
        } catch  {
            const socket = this.sockets.get(address);
            socket.close();
            this.sockets.delete(address);
        }
    }
    onForward(address, forward) {
        if (this.sockets.has(forward.to)) {
            const socket = this.sockets.get(forward.to);
            const type = "forward";
            const from = address;
            const to = forward.to;
            const data = forward.data;
            socket.send(JSON.stringify({
                type,
                from,
                to,
                data
            }));
        }
    }
    onError(address, error) {
        console.error(address, error);
    }
    onClose(address) {
        this.sockets.delete(address);
    }
    listen(port) {
        this.server = createServer((socket)=>{
            this.onConnection(socket);
        }).listen(port);
    }
    dispose() {
        this.server.dispose();
    }
    configuration;
}
class PageHub extends Events {
    socket;
    barrier;
    binding;
    constructor(port){
        super();
        this.port = port;
        this.barrier = new Barrier();
        this.socket = connect(this.port);
        this.socket.on("message", (message)=>this.onMessage(message));
        this.socket.on("error", (error)=>this.onError(error));
        this.socket.on("close", ()=>this.onClose());
    }
    on(event, func) {
        super.on(event, func);
    }
    configuration() {
        return this.barrier.run(()=>this.binding.configuration);
    }
    address() {
        return this.barrier.run(()=>this.binding.address);
    }
    forward(to, data) {
        return this.barrier.run(()=>{
            const type = "forward";
            const from = this.binding.address;
            this.socket.send(JSON.stringify({
                to,
                from,
                type,
                data
            }));
        });
    }
    onMessage(event) {
        const message = JSON.parse(event.data);
        switch(message.type){
            case "binding":
                this.onBinding(message);
                break;
            case "forward":
                this.onForward(message);
                break;
        }
    }
    onBinding(message) {
        this.binding = message;
        this.barrier.resume();
    }
    onForward(message) {
        super.emit("forward", message);
    }
    onClose() {
        this.barrier.pause();
    }
    onError(error) {
        super.emit("error", error);
    }
    dispose() {
        this.socket.dispose();
        super.dispose();
    }
    port;
}
class NetworkHub extends Events {
    socket;
    barrier;
    binding;
    constructor(endpoint){
        super();
        this.endpoint = endpoint;
        this.barrier = new Barrier();
        this.socket = new WebSocket(this.endpoint);
        this.socket.addEventListener("message", (message)=>this.onMessage(message));
        this.socket.addEventListener("error", (error)=>this.onError(error));
        this.socket.addEventListener("close", ()=>this.onClose());
    }
    on(event, func) {
        super.on(event, func);
    }
    configuration() {
        return this.barrier.run(()=>this.binding.configuration);
    }
    address() {
        return this.barrier.run(()=>this.binding.address);
    }
    forward(to, data) {
        return this.barrier.run(()=>{
            const type = "forward";
            const from = this.binding.address;
            this.socket.send(JSON.stringify({
                to,
                from,
                type,
                data
            }));
        });
    }
    onMessage(event) {
        const message = JSON.parse(event.data);
        switch(message.type){
            case "binding":
                this.onBinding(message);
                break;
            case "forward":
                this.onForward(message);
                break;
        }
    }
    onBinding(message) {
        this.binding = message;
        this.barrier.resume();
    }
    onForward(message) {
        super.emit("forward", message);
    }
    onClose() {
        this.barrier.pause();
    }
    onError(error) {
        super.emit("error", error);
    }
    dispose() {
        this.barrier.run(()=>{
            this.socket.close();
        });
    }
    endpoint;
}
function timeout(ms, message = "timeout") {
    return new Promise((_, reject)=>{
        setTimeout(()=>reject(new Error(message)), ms);
    });
}
function receive(channel, eventName) {
    return new Promise((resolve)=>{
        channel.addEventListener(eventName, function handler(event) {
            channel.removeEventListener(eventName, handler);
            resolve(event);
        });
    });
}
var Loopback;
(function(Loopback1) {
    Loopback1[Loopback1["None"] = 0] = "None";
    Loopback1[Loopback1["Sender"] = 1] = "Sender";
    Loopback1[Loopback1["Receiver"] = 2] = "Receiver";
})(Loopback || (Loopback = {}));
const loopbackSwitch = (loopback)=>loopback === Loopback.Receiver ? Loopback.Sender : loopback === Loopback.Sender ? Loopback.Receiver : loopback;
class NegotiateError extends Error {
    constructor(local, remote, error, sdp){
        super(`local: ${local} remote: ${remote} error: ${error.message}`);
        this.local = local;
        this.remote = remote;
        this.error = error;
        this.sdp = sdp;
    }
    local;
    remote;
    error;
    sdp;
}
class PortInUseError extends Error {
    constructor(port){
        super(`The port '${port}' is already in use.`);
        this.port = port;
    }
    port;
}
class Network {
    ports;
    peers;
    constructor(hub){
        this.hub = hub;
        this.hub.on("forward", (forward)=>this.onForward(forward));
        this.ports = new Map();
        this.peers = new Map();
        this.createLoopback();
    }
    address() {
        return this.hub.address();
    }
    getPeers() {
        return this.peers;
    }
    async connect(remote, port) {
        remote = remote === await this.hub.address() || remote === "localhost" ? "localhost:1" : remote;
        const peer = await this.getPeer(remote);
        const channel = peer.connection.createDataChannel(port);
        channel.binaryType = "arraybuffer";
        await Promise.race([
            timeout(4000, `Connection to host '${peer.remote}' timed out.`),
            receive(channel, "open"), 
        ]);
        const response1 = await Promise.race([
            timeout(4000, `${peer.remote}' is not responding.`),
            receive(channel, "message"), 
        ]).then((response)=>new Uint8Array(response.data));
        if (response1[0] === 1) {
            channel.close();
            throw Error(`'${peer.remote}' forcefully closed this connection.`);
        } else {
            return [
                peer,
                channel
            ];
        }
    }
    bindPort(port, callback) {
        if (this.ports.has(port)) {
            throw new PortInUseError(port);
        }
        this.ports.set(port, callback);
    }
    unbindPort(port) {
        this.ports.delete(port);
    }
    dispose() {
        for (const key of this.peers.keys()){
            const peer = this.peers.get(key);
            peer.connection.close();
            this.peers.delete(key);
        }
    }
    async getPeer(remote) {
        const configuration = await this.hub.configuration();
        const local = await this.hub.address();
        if (!this.peers.has(remote)) {
            const connection = new RTCPeerConnection(configuration);
            const loopback = Loopback.None;
            const peer = {
                connection,
                local,
                remote,
                loopback
            };
            connection.addEventListener("negotiationneeded", (event)=>this.onNegotiationNeeded(peer, event));
            connection.addEventListener("icecandidate", (event)=>this.onIceCandidate(peer, event));
            connection.addEventListener("datachannel", (event)=>this.onDataChannel(peer, event));
            this.peers.set(remote, peer);
        }
        return this.peers.get(remote);
    }
    async forward(remote, data) {
        if (remote === "localhost") {
            const type = "forward";
            const from = "localhost";
            const to = "localhost";
            return this.onForward({
                type,
                to,
                from,
                data
            });
        }
        this.hub.forward(remote, data);
    }
    onForward(request) {
        switch(request.data.type){
            case "candidate":
                this.onCandidate(request);
                break;
            case "answer":
                this.onAnswer(request);
                break;
            case "offer":
                this.onOffer(request);
                break;
        }
    }
    async onOffer(request) {
        try {
            const peer = await this.getPeer(this.resolveLoopbackTarget(request));
            await peer.connection.setRemoteDescription(request.data.sdp);
            const sdp = await peer.connection.createAnswer();
            const loopback = loopbackSwitch(request.data.loopback);
            await peer.connection.setLocalDescription(sdp);
            await this.forward(request.from, {
                type: "answer",
                sdp,
                loopback
            });
        } catch (error) {
            const local = request.to;
            const remote = request.from;
            console.warn(new NegotiateError(local, remote, error, request.data.sdp));
        }
    }
    async onAnswer(request) {
        try {
            const peer = await this.getPeer(this.resolveLoopbackTarget(request));
            await peer.connection.setRemoteDescription(request.data.sdp);
        } catch (error) {
            console.warn(new NegotiateError(request.to, request.from, error, request.data.sdp));
        }
    }
    async onCandidate(request) {
        try {
            const peer = await this.getPeer(this.resolveLoopbackTarget(request));
            await peer.connection.addIceCandidate(request.data.candidate);
        } catch (error) {
            console.warn(new NegotiateError(request.to, request.from, error, request.data.candidate));
        }
    }
    async onNegotiationNeeded(peer, _event) {
        try {
            const sdp = await peer.connection.createOffer();
            const loopback = peer.loopback;
            await peer.connection.setLocalDescription(sdp);
            await this.forward(peer.remote, {
                type: "offer",
                sdp,
                loopback
            });
        } catch (error) {
            const local = peer.local;
            const remote = peer.remote;
            console.warn(new NegotiateError(local, remote, error));
        }
    }
    onIceCandidate(peer, event) {
        if (event.candidate === null) {
            return;
        }
        try {
            const candidate = event.candidate;
            const loopback = peer.loopback;
            this.forward(peer.remote, {
                type: "candidate",
                candidate,
                loopback
            });
        } catch (error) {
            console.error(new NegotiateError(peer.local, peer.remote, error));
        }
    }
    async onDataChannel(peer, event) {
        const port = event.channel.label;
        const channel = event.channel;
        channel.binaryType = "arraybuffer";
        try {
            await Promise.race([
                timeout(2000, `Received connection from ${peer.remote} failed to open.`),
                receive(channel, "open"), 
            ]);
            if (!this.ports.has(port)) {
                channel.send(new Uint8Array([
                    1
                ]));
                channel.close();
            } else {
                channel.send(new Uint8Array([
                    0
                ]));
                const callback = this.ports.get(port);
                callback([
                    peer,
                    channel
                ]);
            }
        } catch  {}
    }
    createLoopback() {
        {
            const connection = new RTCPeerConnection();
            const loopback = Loopback.Sender;
            const local = "localhost";
            const remote = "localhost";
            const peer = {
                connection,
                local,
                remote,
                loopback
            };
            connection.addEventListener("negotiationneeded", (event)=>this.onNegotiationNeeded(peer, event));
            connection.addEventListener("icecandidate", (event)=>this.onIceCandidate(peer, event));
            connection.addEventListener("datachannel", (event)=>this.onDataChannel(peer, event));
            this.peers.set("localhost:0", peer);
        }
        {
            const connection = new RTCPeerConnection();
            const loopback = Loopback.Receiver;
            const local = "localhost";
            const remote = "localhost";
            const peer = {
                connection,
                local,
                remote,
                loopback
            };
            connection.addEventListener("negotiationneeded", (event)=>this.onNegotiationNeeded(peer, event));
            connection.addEventListener("icecandidate", (event)=>this.onIceCandidate(peer, event));
            connection.addEventListener("datachannel", (event)=>this.onDataChannel(peer, event));
            this.peers.set("localhost:1", peer);
        }
    }
    resolveLoopbackTarget(request) {
        return request.data.loopback === Loopback.Sender ? "localhost:1" : request.data.loopback === Loopback.Receiver ? "localhost:0" : request.from;
    }
    hub;
}
class InvalidSocketMessage extends Error {
    constructor(){
        super("Received invalid socket message.");
    }
}
class MessageSendSizeTooLarge extends Error {
    constructor(){
        super(`Message size exceeds ${1_000_000} bytes.`);
    }
}
class MessageReceiveSizeTooLarge extends Error {
    constructor(){
        super(`Message received exceeded ${1_000_000} bytes.`);
    }
}
const into = (func)=>func();
class Socket1 extends Events {
    senders = [];
    buffers = [];
    connection;
    channel;
    local;
    remote;
    once(event, func) {
        super.once(event, func);
    }
    on(event, func) {
        super.on(event, func);
    }
    addTrack(track, mediastream) {
        this.senders.push(this.connection.addTrack(track, mediastream));
    }
    send(message) {
        const buffer = Buffer.from(message);
        if (buffer.length > 1_000_000) {
            throw new MessageSendSizeTooLarge();
        } else {
            let index = 0;
            while(index !== buffer.length){
                const slice = buffer.slice(index, index + 32768);
                index += slice.length;
                if (index !== buffer.length) {
                    this.channel.send(this.encode(1, slice));
                } else {
                    this.channel.send(this.encode(0, slice));
                }
            }
        }
    }
    close() {
        while(this.senders.length > 0){
            const sender = this.senders.shift();
            this.connection.removeTrack(sender);
        }
        this.channel.close();
    }
    encode(type, data = Buffer.alloc(0)) {
        return Buffer.concat([
            Buffer.from([
                type
            ]),
            data
        ]);
    }
    decode(data) {
        const buffer = Buffer.from(data);
        return [
            buffer.readInt8(0),
            buffer.slice(1)
        ];
    }
    setupEvents() {
        this.connection.addEventListener("track", (event)=>this.emit("track", event));
        this.channel.addEventListener("error", (event)=>this.emit("error", event));
        this.channel.addEventListener("close", (event)=>this.emit("close", event));
        this.channel.addEventListener("message", (event)=>{
            const [type, buffer] = this.decode(event.data);
            this.buffers.push(buffer);
            const buffered = this.buffers.reduce((acc, c)=>acc + c.length, 0);
            if (buffered > 1_000_000) {
                this.emit("error", new MessageReceiveSizeTooLarge());
                this.close();
            }
            switch(type){
                case 0:
                    {
                        const data = Buffer.concat(this.buffers);
                        this.emit("message", {
                            data
                        });
                        this.buffers = [];
                        break;
                    }
                case 1:
                    {
                        break;
                    }
                default:
                    {
                        this.emit("error", new InvalidSocketMessage());
                        this.close();
                        break;
                    }
            }
        });
    }
    static async fromChannel(connection, channel, local, remote) {
        channel.binaryType = "arraybuffer";
        const socket = new Socket1();
        socket.connection = connection;
        socket.channel = channel;
        socket.remote = remote;
        socket.local = local;
        socket.buffers = [];
        socket.setupEvents();
        return socket;
    }
    static createSocket(net, remote, port) {
        const socket = new Socket1();
        into(async ()=>{
            try {
                const [peer, channel] = await net.connect(remote, port);
                socket.connection = peer.connection;
                socket.channel = channel;
                socket.setupEvents();
                socket.emit("open");
            } catch (error) {
                socket.emit("error", error);
                socket.emit("close");
            }
        });
        return socket;
    }
}
class SocketServer {
    port;
    listening;
    disposed;
    constructor(net, func){
        this.net = net;
        this.func = func;
        this.listening = false;
        this.disposed = false;
    }
    listen(port) {
        this.port = port.toString();
        this.net.bindPort(this.port, (channel)=>this.onChannel(channel));
        this.listening = true;
        return this;
    }
    dispose() {
        if (!this.disposed && this.listening) {
            this.net.unbindPort(this.port);
            this.disposed = true;
        }
    }
    async onChannel(event) {
        const [peer, channel] = event;
        return this.func(await Socket1.fromChannel(peer.connection, channel, peer.local, peer.remote));
    }
    net;
    func;
}
class Sockets {
    servers;
    constructor(net){
        this.net = net;
        this.servers = [];
    }
    createServer(func) {
        const server = new SocketServer(this.net, func);
        this.servers.push(server);
        return server;
    }
    connect(remote, port) {
        return Socket1.createSocket(this.net, remote, port.toString());
    }
    dispose() {
        while(this.servers.length > 0){
            const server = this.servers.shift();
            server.dispose();
        }
    }
    net;
}
const NEXT = 0;
const CANCEL = 1;
const DATA = 2;
const ERROR = 3;
const END = 4;
class NetworkStream {
    readable;
    writable;
    read_barrier;
    read_buffer;
    write_barrier;
    write_buffer;
    constructor(socket, timeout2 = 8000){
        this.socket = socket;
        this.timeout = timeout2;
        this.read_buffer = [];
        this.read_barrier = new Barrier();
        this.readable = new Readable({
            cancel: ()=>this.push(CANCEL),
            pull: async (controller)=>{
                this.push(NEXT);
                await this.read_barrier.run(()=>{
                    this.read_barrier.pause();
                    const [type, buffer] = this.read_buffer.shift();
                    try {
                        switch(type){
                            case DATA:
                                return controller.enqueue(buffer);
                            case END:
                                return controller.close();
                            case ERROR:
                                throw new Error(buffer.toString());
                            default:
                                throw new Error(`Readable receive invalid header. ${type}`);
                        }
                    } catch (error) {
                        return controller.error(error);
                    }
                });
            }
        });
        this.write_buffer = [];
        this.write_barrier = new Barrier();
        this.writable = new Writable({
            write: async (buffer)=>{
                const [type] = await this.next();
                switch(type){
                    case CANCEL:
                        throw Error("Readable cancelled");
                    case NEXT:
                        return this.push(DATA, buffer);
                }
            },
            abort: async (error)=>{
                const [type] = await this.next();
                switch(type){
                    case CANCEL:
                        throw Error("Readable cancelled");
                    case NEXT:
                        return this.push(ERROR, Buffer.from(error.message));
                }
            },
            close: async ()=>{
                const [type] = await this.next();
                switch(type){
                    case CANCEL:
                        throw Error("Readable cancelled");
                    case NEXT:
                        return this.push(END);
                }
            }
        });
        this.readInternal();
    }
    next() {
        return new Promise((resolve, reject)=>{
            const handle = setTimeout(()=>{
                reject(new Error("Network send timeout."));
                this.socket.close();
            }, this.timeout);
            return this.write_barrier.run(()=>{
                clearTimeout(handle);
                this.write_barrier.pause();
                const next = this.write_buffer.shift();
                resolve(next);
            });
        });
    }
    push(type, data = Buffer.alloc(0)) {
        this.socket.send(Buffer.concat([
            Buffer.from([
                type
            ]),
            Buffer.from(data), 
        ]));
    }
    pull() {
        return new Promise((resolve)=>{
            setTimeout(()=>resolve([
                    3,
                    Buffer.from("Network receive timeout.")
                ]), this.timeout);
            this.socket.once("error", ()=>resolve([
                    3,
                    Buffer.from("NetworkStream Socket encounted error."), 
                ]));
            this.socket.once("close", ()=>resolve([
                    4,
                    Buffer.alloc(0)
                ]));
            this.socket.once("message", (message)=>{
                const buffer = Buffer.from(message.data);
                const type = buffer.readInt8(0);
                const data = buffer.slice(1);
                switch(type){
                    case 0:
                        return resolve([
                            0,
                            Buffer.alloc(0)
                        ]);
                    case 1:
                        return resolve([
                            1,
                            Buffer.alloc(0)
                        ]);
                    case 2:
                        return resolve([
                            2,
                            data
                        ]);
                    case 3:
                        return resolve([
                            3,
                            data
                        ]);
                    case 4:
                        return resolve([
                            4,
                            Buffer.alloc(0)
                        ]);
                    default:
                        return resolve([
                            3,
                            Buffer.from("NetworkStream Socket sent unknown message header."), 
                        ]);
                }
            });
        });
    }
    async readInternal() {
        let running = true;
        while(running){
            const next = await this.pull();
            switch(next[0]){
                case 0:
                    {
                        this.write_buffer.push(next);
                        this.write_barrier.resume();
                        break;
                    }
                case 1:
                    {
                        this.write_buffer.push(next);
                        this.write_barrier.resume();
                        running = false;
                        break;
                    }
                case 2:
                    {
                        this.read_buffer.push(next);
                        this.read_barrier.resume();
                        break;
                    }
                case 4:
                    {
                        this.read_buffer.push(next);
                        this.read_barrier.resume();
                        running = false;
                        break;
                    }
                case 3:
                    {
                        this.read_buffer.push(next);
                        this.read_barrier.resume();
                        running = false;
                        break;
                    }
            }
        }
        this.socket.close();
    }
    socket;
    timeout;
}
class ResponseHeaderNotReceivedError extends Error {
    constructor(){
        super("Server closed without sending a header.");
    }
}
class ResponseHeaderInvalidError extends Error {
    constructor(){
        super("Server sent an invalid request header.");
    }
}
class RequestHeaderInvalidError extends Error {
    constructor(){
        super("Client sent an invalid request header.");
    }
}
class HeaderProtocol {
    static async writeRequestHeader(stream, header) {
        await stream.writable.write(Buffer.from(JSON.stringify(header)));
    }
    static async readRequestHeader(stream) {
        const read2 = await stream.readable.read();
        if (read2.done) {
            throw new RequestHeaderInvalidError();
        }
        const header = JSON.parse(read2.value.toString());
        if (header.url === undefined || typeof header.url !== "string") {
            throw new RequestHeaderInvalidError();
        }
        if (header.method === undefined || typeof header.method !== "string") {
            throw new RequestHeaderInvalidError();
        }
        if (header.headers === undefined || typeof header.headers !== "object") {
            throw new RequestHeaderInvalidError();
        }
        return header;
    }
    static async writeResponseHeader(stream, header) {
        await stream.writable.write(Buffer.from(JSON.stringify(header)));
    }
    static async readResponseHeader(stream) {
        const { done , value  } = await stream.readable.read();
        if (done) {
            throw new ResponseHeaderNotReceivedError();
        }
        const header = JSON.parse(value.toString());
        if (header.status === undefined) {
            throw new ResponseHeaderInvalidError();
        }
        if (header.headers === undefined) {
            throw new ResponseHeaderInvalidError();
        }
        return header;
    }
}
class BodyProtocol {
    static partition(buffers, size) {
        const buffer = Buffer.concat(buffers);
        const segments = [];
        let offset = 0;
        while(true){
            const slice = buffer.slice(offset, offset + size);
            offset += slice.length;
            if (slice.length > 0) {
                segments.push(slice);
                continue;
            }
            break;
        }
        return segments;
    }
    static async writeReadable(stream, readable, options = {
        ignoreError: false
    }) {
        try {
            const empty = Buffer.alloc(0);
            let store = empty;
            for await (const buffer of readable){
                const buffers = this.partition([
                    store,
                    buffer
                ], 65536);
                store = empty;
                for (const buffer1 of buffers){
                    if (buffer1.length === 65536) {
                        await stream.writable.write(buffer1);
                    } else {
                        store = buffer1;
                    }
                }
            }
            if (store.length > 0) {
                await stream.writable.write(store);
            }
            await stream.writable.write(Buffer.alloc(0));
        } catch (error) {
            if (!options.ignoreError) {
                throw error;
            }
        }
    }
    static readReadable(stream) {
        return new Readable({
            pull: async (controller)=>{
                try {
                    const next = await stream.readable.read();
                    const buffer = next.value;
                    const end = buffer.length === 0;
                    if (!end) {
                        controller.enqueue(buffer);
                    } else {
                        controller.close();
                    }
                } catch (_error) {
                    controller.error(new Error("Unable to read from this stream."));
                }
            }
        });
    }
    static async writeQueryable(stream, queryable, options = {
        ignoreError: false
    }) {
        try {
            for await (const record of queryable){
                const json = JSON.stringify(record);
                const buffer = Buffer.from(json, "utf-8");
                await stream.writable.write(buffer);
            }
            await stream.writable.write(Buffer.alloc(0));
        } catch (error) {
            if (!options.ignoreError) {
                throw error;
            }
        }
    }
    static readQueryable(stream1) {
        async function* generator(stream) {
            for await (const buffer of stream.readable){
                if (buffer.length === 0) {
                    break;
                }
                const json = buffer.toString("utf-8");
                const record = JSON.parse(json);
                yield record;
            }
        }
        return new Queryable(generator(stream1));
    }
    static async writeMediaStream(stream, mediastream, options = {
        ignoreError: false
    }) {
        try {
            await stream.writable.write(Buffer.from("mediastream"));
            for (const track of mediastream.getTracks()){
                await stream.socket.addTrack(track, mediastream);
            }
            await stream.writable.write(Buffer.alloc(0));
        } catch (error) {
            if (!options.ignoreError) {
                throw error;
            }
        }
    }
    static async readMediaStream(stream2) {
        function wait_for_stream(stream, timeout3) {
            return new Promise((resolve, reject)=>{
                setTimeout(()=>reject(new Error("MediaStream receive timeout.")), timeout3);
                stream.socket.once("track", (track)=>resolve(track.streams[0]));
            });
        }
        async function read_disposition() {
            const { value: disposition  } = await stream2.readable.read();
            const { value: eof  } = await stream2.readable.read();
            return [
                disposition,
                eof
            ];
        }
        async function read_transmit() {
            for await (const _buffer of stream2.readable){}
        }
        const [disposition1, eof1] = await read_disposition();
        if (disposition1?.toString() !== "mediastream" && eof1?.length !== 0) {
            throw Error("Unable to read mediastream. Sender sent invalid data.");
        }
        const mediastream = await wait_for_stream(stream2, 4000);
        read_transmit();
        return mediastream;
    }
}
class FetchRequest {
    constructor(stream, header, body){
        this.stream = stream;
        this.header = header;
        this.body = body;
    }
    async getResponse() {
        await HeaderProtocol.writeRequestHeader(this.stream, this.header);
        BodyProtocol.writeReadable(this.stream, this.body, {
            ignoreError: true
        });
        return HeaderProtocol.readResponseHeader(this.stream);
    }
    stream;
    header;
    body;
}
class FetchResponse {
    headers;
    status;
    constructor(stream, response){
        this.stream = stream;
        this.response = response;
        this.headers = this.response.headers;
        this.status = this.response.status;
    }
    readable() {
        return BodyProtocol.readReadable(this.stream);
    }
    query() {
        return BodyProtocol.readQueryable(this.stream);
    }
    mediastream() {
        return BodyProtocol.readMediaStream(this.stream);
    }
    async buffer() {
        const buffers = [];
        for await (const buffer of this.readable()){
            buffers.push(buffer);
        }
        return Buffer.concat(buffers);
    }
    async text(encoding) {
        const buffer = await this.buffer();
        return buffer.toString(encoding);
    }
    async json() {
        const buffer = await this.buffer();
        return JSON.parse(buffer.toString("utf-8"));
    }
    stream;
    response;
}
class FetchUrlError extends Error {
    constructor(message){
        super(message);
    }
}
class Fetch {
    constructor(sockets){
        this.sockets = sockets;
    }
    createReadable(buffer) {
        const queue = buffer.length > 0 ? [
            buffer
        ] : [];
        return new Readable({
            pull: (controller)=>{
                if (queue.length > 0) {
                    const next = queue.shift();
                    controller.enqueue(next);
                } else {
                    controller.close();
                }
            }
        });
    }
    resolveBodyAsReadable(body) {
        if (body === undefined) {
            return this.createReadable(Buffer.alloc(0));
        } else if (body instanceof Readable) {
            return body;
        } else if (body instanceof Uint8Array) {
            return this.createReadable(body);
        } else if (body instanceof ArrayBuffer) {
            return this.createReadable(Buffer.from(body));
        } else if (typeof body === "string") {
            return this.createReadable(Buffer.from(body));
        } else {
            const json = JSON.stringify(body);
            return this.createReadable(Buffer.from(json));
        }
    }
    async connect(host, port) {
        return new Promise((resolve, reject)=>{
            const socket = this.sockets.connect(host, port);
            socket.once("error", (error)=>reject(error));
            socket.once("close", ()=>reject(new Error("Fetch socket closed unexpectedly.")));
            socket.once("open", ()=>resolve(socket));
        });
    }
    async fetch(endpoint, options) {
        options = options || {};
        options.method = options.method || "get";
        options.headers = options.headers || {};
        const result = Url.parse(endpoint);
        if (result.protocol && result.protocol !== "rest:") {
            throw new FetchUrlError(`Can only fetch with 'rest:// protocols.'`);
        }
        if (result.path === null) {
            throw new FetchUrlError(`The fetch URL '${result.path}' is invalid.`);
        }
        const url = result.path;
        const host = result.host || "localhost";
        const port = result.port || "80";
        const method = options.method || "get";
        const headers = options.headers || {};
        const body = this.resolveBodyAsReadable(options.body);
        const stream = new NetworkStream(await this.connect(host, port));
        const request = new FetchRequest(stream, {
            url,
            method,
            headers
        }, body);
        const response = await request.getResponse();
        return new FetchResponse(stream, response);
    }
    sockets;
}
function asMiddleware(middleware) {
    if (typeof middleware === "function") {
        const handle = middleware;
        return {
            handle
        };
    } else {
        return middleware;
    }
}
function runStack(stack, request, response, next) {
    return stack.length > 0 ? stack.shift().handle(request, response, ()=>runStack(stack, request, response, next)) : next();
}
class Pattern {
    results;
    regex;
    params;
    constructor(pattern){
        this.pattern = pattern;
        this.results = Pattern.parsePattern(this.pattern);
        this.regex = Pattern.buildRegex(this.results);
        this.params = Pattern.buildParams(this.results);
    }
    match(url) {
        const match = url.match(this.regex);
        if (match) {
            return this.params.reduce((acc, param, index)=>{
                acc[param] = match[index + 1];
                return acc;
            }, {});
        }
        return undefined;
    }
    static parsePattern(pattern) {
        const characters = pattern.split("");
        const results = [];
        let mode = "literal";
        let buffer = [];
        while(characters.length > 0){
            const current = characters.shift();
            if (current === "?" || current === "&") {
                throw Error(`Illegal character '${current}' in pattern '${pattern}'`);
            }
            if (mode === "literal" && current !== ":") {
                buffer.push(current);
                continue;
            }
            if (current === ":") {
                const type = "literal";
                const value = buffer.join("");
                results.push({
                    type,
                    value
                });
                mode = "param";
                buffer = [];
                continue;
            }
            if (mode === "param" && (current === "/" || current === "-")) {
                const type = "param";
                const value = buffer.join("");
                results.push({
                    type,
                    value
                });
                mode = "literal";
                buffer = [];
                buffer.push(current);
                continue;
            }
            buffer.push(current);
        }
        if (buffer.length > 0) {
            const type = mode;
            const value = buffer.join("");
            results.push({
                type,
                value
            });
        }
        return results;
    }
    static buildRegex(results) {
        const expr = results.map((result)=>result.type === "param" ? "([\\w-_$]*)" : result.value).join("");
        return new RegExp(`^${expr}$`);
    }
    static buildParams(results) {
        return results.filter((result)=>result.type === "param").map((result)=>result.value);
    }
    pattern;
}
class Route {
    constructor(method, pattern, middleware, handler){
        this.method = method;
        this.pattern = pattern;
        this.middleware = middleware;
        this.handler = handler;
    }
    handle(request, response, next) {
        const url = Url.parse(request.url);
        const params = this.pattern.match(url.pathname);
        if (params && request.method === this.method) {
            request.params = params;
            request.path = url.path;
            request.query = QueryString.parse(request.url);
            return runStack([
                ...this.middleware
            ], request, response, ()=>{
                return this.handler(request, response);
            });
        }
        next();
    }
    method;
    pattern;
    middleware;
    handler;
}
class Router {
    middleware = [];
    get(...args) {
        return this.method.apply(this, [
            "get",
            ...args
        ]);
    }
    post(...args) {
        return this.method.apply(this, [
            "post",
            ...args
        ]);
    }
    put(...args) {
        return this.method.apply(this, [
            "put",
            ...args
        ]);
    }
    patch(...args) {
        return this.method.apply(this, [
            "patch",
            ...args
        ]);
    }
    delete(...args) {
        return this.method.apply(this, [
            "delete",
            ...args
        ]);
    }
    method(...args) {
        if (args.length === 4) {
            const [method, endpoint, middleware, func] = args;
            const resolved = middleware.map((m)=>asMiddleware(m));
            return this.use(new Route(method, new Pattern(endpoint), resolved, func));
        } else if (args.length === 3) {
            const [method, endpoint, func] = args;
            return this.use(new Route(method, new Pattern(endpoint), [], func));
        }
        throw Error("invalid argument");
    }
    use(middleware) {
        if (typeof middleware === "function") {
            const handle = middleware;
            this.middleware.push({
                handle
            });
        } else {
            this.middleware.push(middleware);
        }
        return this;
    }
    handle(request, response, next) {
        runStack([
            ...this.middleware
        ], request, response, ()=>next());
    }
}
class RestRequest {
    headers;
    url;
    method;
    local;
    remote;
    path;
    query;
    params;
    constructor(stream, header){
        this.stream = stream;
        this.header = header;
        this.local = this.stream.socket.local;
        this.remote = this.stream.socket.remote;
        this.url = header.url;
        this.headers = header.headers;
        this.method = header.method;
        this.path = "";
        this.query = {};
        this.params = {};
    }
    readable() {
        return BodyProtocol.readReadable(this.stream);
    }
    async buffer() {
        const buffers = [];
        for await (const buffer of this.readable()){
            buffers.push(buffer);
        }
        return Buffer.concat(buffers);
    }
    async text(encoding) {
        const buffer = await this.buffer();
        return buffer.toString(encoding);
    }
    async json() {
        const buffer = await this.buffer();
        return JSON.parse(buffer.toString("utf-8"));
    }
    stream;
    header;
}
class MediaStreamContext {
    streaming;
    constructor(stream){
        this.stream = stream;
        this.streaming = true;
        this.transmit();
    }
    dispose() {
        this.streaming = false;
    }
    async delay(ms) {
        return new Promise((resolve)=>setTimeout(resolve, ms));
    }
    async transmit() {
        while(this.streaming){
            await this.stream.writable.write(Buffer.from([
                1
            ]));
            await this.delay(100);
        }
        await this.stream.writable.close();
    }
    stream;
}
class ResponseAlreadySentError extends Error {
    constructor(){
        super("Responses can only be sent once.");
    }
}
class RestResponse {
    headers;
    status;
    sent;
    constructor(stream){
        this.stream = stream;
        this.headers = {};
        this.status = 200;
        this.sent = false;
    }
    async mediastream(mediastream, status) {
        if (this.sent) throw new ResponseAlreadySentError();
        this.sent = true;
        this.status = status || this.status;
        await HeaderProtocol.writeResponseHeader(this.stream, {
            status: this.status,
            headers: this.headers
        });
        await BodyProtocol.writeMediaStream(this.stream, mediastream);
        return new MediaStreamContext(this.stream);
    }
    async readable(readable, status) {
        if (this.sent) throw new ResponseAlreadySentError();
        this.sent = true;
        this.status = status || this.status;
        await HeaderProtocol.writeResponseHeader(this.stream, {
            status: this.status,
            headers: this.headers
        });
        await BodyProtocol.writeReadable(this.stream, readable);
        await this.stream.writable.close();
    }
    async query(queryable, status) {
        if (this.sent) throw new ResponseAlreadySentError();
        this.sent = true;
        this.status = status || this.status;
        await HeaderProtocol.writeResponseHeader(this.stream, {
            status: this.status,
            headers: this.headers
        });
        await BodyProtocol.writeQueryable(this.stream, queryable);
        await this.stream.writable.close();
    }
    async buffer(buffer, status) {
        const queue = [
            buffer
        ];
        return this.readable(new Readable({
            pull: async (controller)=>{
                if (queue.length > 0) {
                    controller.enqueue(queue.shift());
                } else {
                    controller.close();
                }
            }
        }), status);
    }
    async send(data, status) {
        return this.buffer(Buffer.from(data), status);
    }
    async text(data, status) {
        this.headers["Content-Type"] = "text/plain";
        return this.buffer(Buffer.from(data), status);
    }
    async json(data, status) {
        this.headers["Content-Type"] = "application/json";
        const buffer = Buffer.from(JSON.stringify(data));
        return this.buffer(buffer, status);
    }
    stream;
}
const NETWORK_TIMEOUT = 4000;
class RestServer extends Router {
    server;
    constructor(sockets, options){
        super();
        this.sockets = sockets;
        this.options = options;
        this.options = this.options || {};
        this.options.timeout = this.options.timeout || NETWORK_TIMEOUT;
    }
    listen(port) {
        this.server = this.sockets.createServer((socket)=>this.onSocket(socket));
        this.server.listen(port);
        return this;
    }
    dispose() {
        this.server.dispose();
    }
    async onSocket(socket) {
        const stream = new NetworkStream(socket, this.options.timeout);
        const response = new RestResponse(stream);
        try {
            const header = await HeaderProtocol.readRequestHeader(stream);
            const request = new RestRequest(stream, header);
            this.handle(request, response, ()=>{
                response.text("not found", 404);
            });
        } catch (_error) {
            response.text("internal server error", 500);
        }
    }
    sockets;
    options;
}
class Rest {
    servers;
    constructor(sockets){
        this.sockets = sockets;
        this.servers = [];
    }
    createServer(options) {
        const server = new RestServer(this.sockets, options);
        this.servers.push(server);
        return server;
    }
    async fetch(endpoint, options = {
        method: "get",
        headers: {}
    }) {
        return new Fetch(this.sockets).fetch(endpoint, options);
    }
    dispose() {
        while(this.servers.length > 0){
            const server = this.servers.shift();
            server.dispose();
        }
    }
    sockets;
}
class WebRTC {
    static createTestPattern() {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d");
        context.translate(128, 128);
        setInterval(()=>{
            const r = Math.floor(Math.random() * 255);
            const g = Math.floor(Math.random() * 255);
            const b = Math.floor(Math.random() * 255);
            context.fillStyle = `#333`;
            context.fillRect(-256, -256, 512, 512);
            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            context.fillRect(-128, -64, 196, 32);
            context.fillStyle = `white`;
            context.font = "30px Arial";
            context.fillText("smoke-node", -128, 10);
            context.font = "20px Arial";
            context.fillText(new Date().toString(), -128, 40);
            context.rotate(0.01);
        }, 10);
        const facade = canvas;
        return facade["captureStream"](30);
    }
}
class MediaSourceExtensions {
    static resolveCodec(codec) {
        switch(codec){
            case "mp4":
                return 'video/mp4; codecs="avc1.640029, mp4a.40.5"';
            case "webm":
                return 'video/webm; codecs="vp8, vorbis"';
            default:
                throw Error(`Unknown media codec type ${codec}`);
        }
    }
    static async writeSourceBuffer(readable, buffer) {
        const { done , value  } = await readable.read();
        if (!done) {
            buffer.appendBuffer(value);
            return value.length;
        } else {
            return 0;
        }
    }
    static createMediaSource(readable, codec) {
        const mediasource = new MediaSource();
        mediasource.addEventListener("sourceopen", async ()=>{
            const buffer = mediasource.addSourceBuffer(this.resolveCodec(codec));
            buffer.mode = "sequence";
            buffer.addEventListener("updateend", async ()=>{
                const written = await this.writeSourceBuffer(readable, buffer);
                if (written === 0) {
                    mediasource.endOfStream();
                }
            });
            const written1 = await this.writeSourceBuffer(readable, buffer);
            if (written1 === 0) {
                mediasource.endOfStream();
            }
        });
        return mediasource;
    }
}
class Media {
    createTestPattern() {
        return WebRTC.createTestPattern();
    }
    createMediaSource(readable, codec) {
        return MediaSourceExtensions.createMediaSource(readable, codec);
    }
}
new PageHubServer({}).listen(0);
class Node {
    system;
    network;
    hub;
    sockets;
    rest;
    media;
    constructor(options){
        this.options = options;
        options = options || {};
        this.hub = options.hub || new PageHub(0);
        this.network = new Network(this.hub);
        this.system = new System(this.network);
        this.sockets = new Sockets(this.network);
        this.rest = new Rest(this.sockets);
        this.media = new Media();
    }
    address() {
        return this.hub.address();
    }
    async dispose() {
        await this.rest.dispose();
        await this.sockets.dispose();
        await this.network.dispose();
    }
    options;
}
async function createServer1() {
    const hostHub = new NetworkHub("ws://127.0.0.1:5000");
    const host = new Node({
        hub: hostHub
    });
    const app = host.rest.createServer();
    app.get("/", (_req, res)=>{
        res.headers["Content-Type"] = "text/html";
        res.send("<h1>hello world</h1>");
    });
    app.listen(80);
    console.log(await host.address());
}
async function connectServer(addr) {
    const nodeHub = new NetworkHub("ws://127.0.0.1:5000");
    const node = new Node({
        hub: nodeHub
    });
    const resp = await node.rest.fetch(`rest://${addr}/`);
    const content = await resp.text();
    console.log(content);
    await nodeHub.dispose();
    await node.dispose();
}
export { createServer1 as createServer };
export { connectServer as connectServer };
